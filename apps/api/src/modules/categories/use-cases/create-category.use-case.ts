import { generateSlug } from "@kronostore/shared/utils";
import type { Category, CategoryRepository } from "../domain/category-repository.js";
import type { CreateCategoryInput } from "../domain/category.js";

export class CreateCategoryUseCase {
  constructor(private readonly repository: CategoryRepository) {}

  async execute(input: CreateCategoryInput): Promise<Category> {
    const slug = generateSlug(input.name);
    return this.repository.create({ ...input, slug });
  }
}
