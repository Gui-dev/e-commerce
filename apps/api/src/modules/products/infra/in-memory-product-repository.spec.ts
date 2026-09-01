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
});
