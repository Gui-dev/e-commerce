import type { Product, ProductRepository } from '../domain/product-repository.js'
import type { CreateProductInput } from '../domain/product.js'
import { generateSlug } from '@kronostore/shared/utils'
import { DomainError } from '../../../lib/errors.js'

export class CreateProductUseCase {
  constructor(private readonly repository: ProductRepository) {}

  async execute(input: CreateProductInput): Promise<Product> {
    if (!input.name || input.name.trim().length === 0) {
      throw new DomainError('VALIDATION_ERROR', 'Name is required')
    }

    if (!input.description || input.description.trim().length < 10) {
      throw new DomainError('VALIDATION_ERROR', 'Description must be at least 10 characters')
    }

    if (input.priceCents <= 0) {
      throw new DomainError('VALIDATION_ERROR', 'Price must be positive')
    }

    const slug = generateSlug(input.name)

    return this.repository.create({
      ...input,
      name: input.name.trim(),
      description: input.description.trim(),
      slug,
    })
  }
}
