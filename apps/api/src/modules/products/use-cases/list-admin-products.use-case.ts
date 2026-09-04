import type { Product, ProductRepository } from "../domain/product-repository.js";

export interface ListAdminProductsOutput {
  data: Product[];
  total: number;
}

export class ListAdminProductsUseCase {
  constructor(private readonly repository: ProductRepository) {}

  async execute(): Promise<ListAdminProductsOutput> {
    const { products, total } = await this.repository.list({
      page: 1,
      limit: 1000,
    });

    return { data: products, total };
  }
}
