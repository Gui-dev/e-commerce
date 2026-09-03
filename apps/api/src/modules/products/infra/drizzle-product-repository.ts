import { eq, ilike, or, sql } from "drizzle-orm";
import { db as defaultDb } from "../../../lib/db/index.js";
import {
  cartItems,
  orderItems,
  productVariants,
  products,
  stock,
  stockMovements,
} from "../../../lib/db/schema.js";
import { getTransactionClient } from "../../../lib/db/transaction.js";
import type {
  CreateProductInput,
  Product,
  ProductRepository,
  ProductVariant,
  UpdateProductInput,
} from "../domain/product-repository.js";
import {
  ProductNotFoundError,
  ProductSkuConflictError,
  ProductSlugConflictError,
} from "../domain/product.js";

type DbClient = typeof defaultDb;

function mapProduct(row: typeof products.$inferSelect): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    categoryId: row.categoryId,
    priceCents: row.priceCents,
    imageUrl: row.imageUrl,
    skuPrefix: row.skuPrefix,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapVariant(row: typeof productVariants.$inferSelect): ProductVariant {
  return {
    id: row.id,
    productId: row.productId,
    name: row.name,
    sku: row.sku,
    priceCents: row.priceCents,
    attributes: row.attributes as Record<string, string> | null,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

export class DrizzleProductRepository implements ProductRepository {
  private explicitTx?: DbClient;

  constructor(tx?: DbClient) {
    this.explicitTx = tx;
  }

  private get db(): DbClient {
    return this.explicitTx ?? getTransactionClient() ?? defaultDb;
  }

  async findById(id: string): Promise<Product | null> {
    const row = await this.db.query.products.findFirst({
      where: (p, { eq }) => eq(p.id, id),
    });
    return row ? mapProduct(row) : null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const row = await this.db.query.products.findFirst({
      where: (p, { eq }) => eq(p.slug, slug),
    });
    return row ? mapProduct(row) : null;
  }

  async list(params: {
    categoryId?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ products: Product[]; total: number }> {
    const conditions = [];

    if (params.categoryId) {
      conditions.push(eq(products.categoryId, params.categoryId));
    }

    if (params.search) {
      const pattern = `%${params.search}%`;
      conditions.push(or(ilike(products.name, pattern), ilike(products.description, pattern)));
    }

    const where = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

    const offset = (params.page - 1) * params.limit;

    const [countResult, rows] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
      this.db
        .select()
        .from(products)
        .where(where)
        .orderBy(products.createdAt)
        .limit(params.limit)
        .offset(offset),
    ]);

    return {
      products: rows.map(mapProduct),
      total: countResult[0]?.count ?? 0,
    };
  }

  async create(input: CreateProductInput & { slug: string }): Promise<Product> {
    try {
      const [row] = await this.db
        .insert(products)
        .values({
          name: input.name,
          slug: input.slug,
          description: input.description,
          categoryId: input.categoryId,
          priceCents: input.priceCents,
          imageUrl: input.imageUrl ?? null,
          skuPrefix: input.skuPrefix,
        })
        .returning();

      return mapProduct(row);
    } catch (err: unknown) {
      if (isPgUniqueViolation(err)) {
        throw new ProductSlugConflictError(input.slug);
      }
      throw err;
    }
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const existing = await this.findById(id);
    if (!existing) throw new ProductNotFoundError(id);

    const [row] = await this.db
      .update(products)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    return mapProduct(row);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new ProductNotFoundError(id);

    const variants = await this.findVariantsByProductId(id);
    for (const v of variants) {
      await this.deleteVariant(v.id);
    }

    await this.db.delete(products).where(eq(products.id, id));
  }

  async findVariantById(id: string): Promise<ProductVariant | null> {
    const row = await this.db.query.productVariants.findFirst({
      where: (pv, { eq }) => eq(pv.id, id),
    });
    return row ? mapVariant(row) : null;
  }

  async findVariantsByProductId(productId: string): Promise<ProductVariant[]> {
    const rows = await this.db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId));

    return rows.map(mapVariant);
  }

  async findVariantBySku(sku: string): Promise<ProductVariant | null> {
    const row = await this.db.query.productVariants.findFirst({
      where: (pv, { eq }) => eq(pv.sku, sku),
    });
    return row ? mapVariant(row) : null;
  }

  async createVariant(
    productId: string,
    input: {
      name: string;
      sku: string;
      priceCents?: number | null;
      attributes?: Record<string, string>;
    },
  ): Promise<ProductVariant> {
    try {
      const [row] = await this.db
        .insert(productVariants)
        .values({
          productId,
          name: input.name,
          sku: input.sku,
          priceCents: input.priceCents ?? null,
          attributes: input.attributes ?? null,
        })
        .returning();

      return mapVariant(row);
    } catch (err: unknown) {
      if (isPgUniqueViolation(err)) {
        throw new ProductSkuConflictError(input.sku);
      }
      throw err;
    }
  }

  async updateVariant(
    id: string,
    input: {
      name?: string;
      priceCents?: number | null;
      attributes?: Record<string, string>;
      isActive?: boolean;
    },
  ): Promise<ProductVariant> {
    const existing = await this.findVariantById(id);
    if (!existing) throw new ProductNotFoundError(id);

    const [row] = await this.db
      .update(productVariants)
      .set(input)
      .where(eq(productVariants.id, id))
      .returning();

    return mapVariant(row);
  }

  async deleteVariant(id: string): Promise<void> {
    const existing = await this.findVariantById(id);
    if (!existing) throw new ProductNotFoundError(id);

    await this.db.delete(stockMovements).where(eq(stockMovements.variantId, id));
    await this.db.delete(cartItems).where(eq(cartItems.variantId, id));
    await this.db.delete(orderItems).where(eq(orderItems.variantId, id));
    await this.db.delete(stock).where(eq(stock.variantId, id));
    await this.db.delete(productVariants).where(eq(productVariants.id, id));
  }
}

function isPgUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as Record<string, unknown>;
  if (e.code === "23505") return true;
  if (e.cause && typeof e.cause === "object") {
    const c = e.cause as Record<string, unknown>;
    if (c.code === "23505") return true;
  }
  return false;
}
