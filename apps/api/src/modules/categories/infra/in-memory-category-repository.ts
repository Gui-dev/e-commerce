import type {
  Category,
  CategoryRepository,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../domain/category-repository.js";
import { CategoryNotFoundError, CategorySlugConflictError } from "../domain/category.js";

export class InMemoryCategoryRepository implements CategoryRepository {
  private categories: Map<string, Category> = new Map();
  private nextId = 1;

  async findById(id: string): Promise<Category | null> {
    return this.categories.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    for (const category of this.categories.values()) {
      if (category.slug === slug) return category;
    }
    return null;
  }

  async list(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async create(input: CreateCategoryInput & { slug: string }): Promise<Category> {
    const existing = await this.findBySlug(input.slug);
    if (existing) throw new CategorySlugConflictError(input.slug);

    const category: Category = {
      id: `cat-${this.nextId++}`,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      parentId: input.parentId ?? null,
      createdAt: new Date(),
    };

    this.categories.set(category.id, category);
    return category;
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const category = this.categories.get(id);
    if (!category) throw new CategoryNotFoundError(id);

    const updated: Category = {
      ...category,
      ...input,
    };

    this.categories.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.categories.has(id)) throw new CategoryNotFoundError(id);
    this.categories.delete(id);
  }
}
