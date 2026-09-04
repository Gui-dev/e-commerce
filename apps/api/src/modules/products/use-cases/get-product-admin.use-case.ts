import type { Product, ProductRepository } from "../domain/product-repository.js";

export class GetProductAdminUseCase {
  constructor(private readonly repository: ProductRepository) {}

  async execute(id: string): Promise<Product> {
    const product = await this.repository.findById(id);
    if (!product) {
      throw new Error("Product not found");
    }
    return product;
  }
}
