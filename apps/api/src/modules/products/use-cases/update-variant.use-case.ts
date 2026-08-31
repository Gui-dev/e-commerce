import type { ProductRepository, ProductVariant } from "../domain/product-repository.js";

export interface UpdateVariantInput {
  name?: string;
  priceCents?: number | null;
  attributes?: Record<string, string>;
  isActive?: boolean;
}

export class UpdateVariantUseCase {
  constructor(private readonly repository: ProductRepository) {}

  async execute(id: string, input: UpdateVariantInput): Promise<ProductVariant> {
    return this.repository.updateVariant(id, input);
  }
}
