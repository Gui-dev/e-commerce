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

export class InMemoryProductRepository implements ProductRepository {
  private products: Map<string, Product> = new Map();
  private variants: Map<string, ProductVariant> = new Map();
  private nextId = 1;

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    for (const product of this.products.values()) {
      if (product.slug === slug) return product;
    }
    return null;
  }

  async list(params: {
    categoryId?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ products: Product[]; total: number }> {
    let filtered = Array.from(this.products.values());

    if (params.categoryId) {
      filtered = filtered.filter((p) => p.categoryId === params.categoryId);
    }

    if (params.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search),
      );
    }

    const total = filtered.length;
    const start = (params.page - 1) * params.limit;
    const products = filtered.slice(start, start + params.limit);

    return { products, total };
  }

  async create(input: CreateProductInput & { slug: string }): Promise<Product> {
    const existing = await this.findBySlug(input.slug);
    if (existing) throw new ProductSlugConflictError(input.slug);

    const now = new Date();
    const product: Product = {
      id: `prod-${this.nextId++}`,
      name: input.name,
      slug: input.slug,
      description: input.description,
      categoryId: input.categoryId,
      priceCents: input.priceCents,
      imageUrl: input.imageUrl ?? null,
      skuPrefix: input.skuPrefix,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.products.set(product.id, product);
    return product;
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const product = this.products.get(id);
    if (!product) throw new ProductNotFoundError(id);

    const updated: Product = {
      ...product,
      ...input,
      updatedAt: new Date(),
    };

    this.products.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.products.has(id)) throw new ProductNotFoundError(id);
    this.products.delete(id);
  }

  async findVariantById(id: string): Promise<ProductVariant | null> {
    return this.variants.get(id) ?? null;
  }

  async findVariantsByProductId(productId: string): Promise<ProductVariant[]> {
    return Array.from(this.variants.values()).filter((v) => v.productId === productId);
  }

  async findVariantBySku(sku: string): Promise<ProductVariant | null> {
    for (const variant of this.variants.values()) {
      if (variant.sku === sku) return variant;
    }
    return null;
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
    const existing = await this.findVariantBySku(input.sku);
    if (existing) throw new ProductSkuConflictError(input.sku);

    const variant: ProductVariant = {
      id: `var-${this.nextId++}`,
      productId,
      name: input.name,
      sku: input.sku,
      priceCents: input.priceCents ?? null,
      attributes: input.attributes ?? null,
      isActive: true,
      createdAt: new Date(),
    };

    this.variants.set(variant.id, variant);
    return variant;
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
    const variant = this.variants.get(id);
    if (!variant) throw new ProductNotFoundError(id);

    const updated: ProductVariant = {
      ...variant,
      ...input,
    };

    this.variants.set(id, updated);
    return updated;
  }

  async deleteVariant(id: string): Promise<void> {
    if (!this.variants.has(id)) throw new ProductNotFoundError(id);
    this.variants.delete(id);
  }
}
