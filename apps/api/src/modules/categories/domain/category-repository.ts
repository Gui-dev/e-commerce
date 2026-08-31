import type { Category, CreateCategoryInput, UpdateCategoryInput } from "./category.js";

export type { Category, CreateCategoryInput, UpdateCategoryInput } from "./category.js";

export interface CategoryRepository {
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  list(): Promise<Category[]>;
  create(input: CreateCategoryInput & { slug: string }): Promise<Category>;
  update(id: string, input: UpdateCategoryInput): Promise<Category>;
  delete(id: string): Promise<void>;
}
