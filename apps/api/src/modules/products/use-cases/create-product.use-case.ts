import { generateSlug } from "@kronostore/shared/utils";
import type { Product, ProductRepository } from "../domain/product-repository.js";
import type { CreateProductInput } from "../domain/product.js";

export class CreateProductUseCase {
  constructor(private readonly repository: ProductRepository) {}

  async execute(input: CreateProductInput): Promise<Product> {
    const slug = generateSlug(input.name);

    return this.repository.create({
      ...input,
      name: input.name.trim(),
      description: input.description.trim(),
      slug,
    });
  }
}
