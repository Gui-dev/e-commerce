import { eq } from "drizzle-orm";
import { db as defaultDb } from "../../../lib/db/index.js";
import { categories } from "../../../lib/db/schema.js";
import type {
  Category,
  CategoryRepository,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../domain/category-repository.js";
import { CategoryNotFoundError, CategorySlugConflictError } from "../domain/category.js";

type DbClient = typeof defaultDb;

function mapCategory(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl,
    parentId: row.parentId,
    createdAt: row.createdAt,
  };
}

export class DrizzleCategoryRepository implements CategoryRepository {
  private db: DbClient;

  constructor(tx?: DbClient) {
    this.db = tx ?? defaultDb;
  }

  async findById(id: string): Promise<Category | null> {
    const row = await this.db.query.categories.findFirst({
      where: (c, { eq }) => eq(c.id, id),
    });
    return row ? mapCategory(row) : null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const row = await this.db.query.categories.findFirst({
      where: (c, { eq }) => eq(c.slug, slug),
    });
    return row ? mapCategory(row) : null;
  }

  async list(): Promise<Category[]> {
    const rows = await this.db.select().from(categories);
    return rows.map(mapCategory);
  }

  async create(input: CreateCategoryInput & { slug: string }): Promise<Category> {
    try {
      const [row] = await this.db
        .insert(categories)
        .values({
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          imageUrl: input.imageUrl ?? null,
          parentId: input.parentId ?? null,
        })
        .returning();

      return mapCategory(row);
    } catch (err: unknown) {
      if (isPgUniqueViolation(err)) {
        throw new CategorySlugConflictError(input.slug);
      }
      throw err;
    }
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const existing = await this.findById(id);
    if (!existing) throw new CategoryNotFoundError(id);

    const [row] = await this.db
      .update(categories)
      .set(input)
      .where(eq(categories.id, id))
      .returning();

    return mapCategory(row);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new CategoryNotFoundError(id);

    await this.db.delete(categories).where(eq(categories.id, id));
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
