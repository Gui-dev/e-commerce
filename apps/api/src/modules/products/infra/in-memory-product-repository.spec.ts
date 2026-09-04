import { describe, expect, it } from "vitest";
import { InMemoryProductRepository } from "./in-memory-product-repository.js";
import { runProductRepositoryContractSuite } from "./products-repository.contract-test.js";

runProductRepositoryContractSuite("InMemoryProductRepository", async () => {
  return new InMemoryProductRepository();
});

describe("InMemoryProductRepository", () => {
  it("should return empty list when no products exist", async () => {
    const repo = new InMemoryProductRepository();
    const result = await repo.list({ page: 1, limit: 10 });
    expect(result.products).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("should return null for non-existent id", async () => {
    const repo = new InMemoryProductRepository();
    const found = await repo.findById("non-existent");
    expect(found).toBeNull();
  });

  it("should filter products by priceMin", async () => {
    const repository = new InMemoryProductRepository();
    await repository.create({
      name: "Cheap Product",
      description: "A cheap product",
      categoryId: "cat-001",
      priceCents: 5000,
      slug: "cheap-product",
      skuPrefix: "CP",
    });
    await repository.create({
      name: "Expensive Product",
      description: "An expensive product",
      categoryId: "cat-001",
      priceCents: 50000,
      slug: "expensive-product",
      skuPrefix: "EP",
    });

    const result = await repository.list({ priceMin: 100, page: 1, limit: 10 });
    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe("Expensive Product");
  });

  it("should filter products by priceMax", async () => {
    const repository = new InMemoryProductRepository();
    await repository.create({
      name: "Cheap Product",
      description: "A cheap product",
      categoryId: "cat-001",
      priceCents: 5000,
      slug: "cheap-product",
      skuPrefix: "CP",
    });
    await repository.create({
      name: "Expensive Product",
      description: "An expensive product",
      categoryId: "cat-001",
      priceCents: 50000,
      slug: "expensive-product",
      skuPrefix: "EP",
    });

    const result = await repository.list({ priceMax: 100, page: 1, limit: 10 });
    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe("Cheap Product");
  });
});
