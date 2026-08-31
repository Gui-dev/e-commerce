import type { Category, CategoryRepository } from '../domain/category-repository.js'

export class ListCategoriesUseCase {
  constructor(private readonly repository: CategoryRepository) {}

  async execute(): Promise<Category[]> {
    return this.repository.list()
  }
}
