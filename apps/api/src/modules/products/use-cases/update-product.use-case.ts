import type { Product, ProductRepository } from '../domain/product-repository.js'
import type { UpdateProductInput } from '../domain/product.js'
import { ProductNotFoundError } from '../domain/product.js'

export class UpdateProductUseCase {
  constructor(private readonly repository: ProductRepository) {}

  async execute(id: string, input: UpdateProductInput): Promise<Product> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new ProductNotFoundError(id)

    return this.repository.update(id, input)
  }
}
