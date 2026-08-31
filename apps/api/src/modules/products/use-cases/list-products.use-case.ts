import type { Product, ProductRepository } from '../domain/product-repository.js'

export interface ListProductsInput {
  categoryId?: string
  search?: string
  page?: number
  limit?: number
}

export interface ListProductsOutput {
  products: Product[]
  total: number
  page: number
  limit: number
}

export class ListProductsUseCase {
  constructor(private readonly repository: ProductRepository) {}

  async execute(input: ListProductsInput = {}): Promise<ListProductsOutput> {
    const page = input.page ?? 1
    const limit = Math.min(input.limit ?? 12, 50)

    const { products, total } = await this.repository.list({
      categoryId: input.categoryId,
      search: input.search,
      page,
      limit,
    })

    return { products, total, page, limit }
  }
}
