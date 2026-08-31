import { beforeEach, describe, expect, it } from "vitest";
import { ProductNotFoundError } from "../domain/product.js";
import { InMemoryProductRepository } from "../infra/in-memory-product-repository.js";
import { CreateProductUseCase } from "./create-product.use-case.js";
import { UpdateProductUseCase } from "./update-product.use-case.js";

describe("UpdateProductUseCase", () => {
  let repository: InMemoryProductRepository;
  let useCase: UpdateProductUseCase;
  let createUseCase: CreateProductUseCase;

  beforeEach(() => {
    repository = new InMemoryProductRepository();
    useCase = new UpdateProductUseCase(repository);
    createUseCase = new CreateProductUseCase(repository);
  });

  it("should update a product", async () => {
    const product = await createUseCase.execute({
      name: "Old Name",
      description: "Old description that is long enough",
      categoryId: "cat-001",
      priceCents: 50000,
      skuPrefix: "OLD",
    });

    const updated = await useCase.execute(product.id, {
      name: "New Name",
      priceCents: 60000,
    });

    expect(updated.name).toBe("New Name");
    expect(updated.priceCents).toBe(60000);
  });

  it("should throw ProductNotFoundError for non-existent id", async () => {
    await expect(useCase.execute("non-existent", { name: "Test" })).rejects.toThrow(
      ProductNotFoundError,
    );
  });

  it("should only update provided fields", async () => {
    const product = await createUseCase.execute({
      name: "Original",
      description: "Original description that is long enough",
      categoryId: "cat-001",
      priceCents: 50000,
      skuPrefix: "ORG",
    });

    const updated = await useCase.execute(product.id, { priceCents: 75000 });

    expect(updated.name).toBe("Original");
    expect(updated.priceCents).toBe(75000);
  });
});
