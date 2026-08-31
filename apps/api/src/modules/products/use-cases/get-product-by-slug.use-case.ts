import type { ProductWithVariants, ProductRepository } from '../domain/product-repository.js'
import { ProductNotFoundError } from '../domain/product.js'

export class GetProductBySlugUseCase {
  constructor(private readonly repository: ProductRepository) {}

  async execute(slug: string): Promise<ProductWithVariants> {
    const product = await this.repository.findBySlug(slug)
    if (!product) throw new ProductNotFoundError(slug)

    const variants = await this.repository.findVariantsByProductId(product.id)

    return { ...product, variants }
  }
}
