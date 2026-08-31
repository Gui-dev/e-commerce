import type { ProductRepository, ProductVariant } from "../domain/product-repository.js";
import { ProductNotFoundError } from "../domain/product.js";

export interface CreateVariantInput {
  productId: string;
  name: string;
  sku: string;
  priceCents?: number | null;
  attributes?: Record<string, string>;
}

export class CreateVariantUseCase {
  constructor(private readonly repository: ProductRepository) {}

  async execute(input: CreateVariantInput): Promise<ProductVariant> {
    const product = await this.repository.findById(input.productId);
    if (!product) throw new ProductNotFoundError(input.productId);

    return this.repository.createVariant(input.productId, {
      name: input.name,
      sku: input.sku,
      priceCents: input.priceCents,
      attributes: input.attributes,
    });
  }
}
