import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryProductRepository } from "../infra/in-memory-product-repository.js";
import { CreateProductUseCase } from "./create-product.use-case.js";
import { ListProductsUseCase } from "./list-products.use-case.js";

describe("ListProductsUseCase", () => {
  let repository: InMemoryProductRepository;
  let listUseCase: ListProductsUseCase;
  let createUseCase: CreateProductUseCase;

  beforeEach(() => {
    repository = new InMemoryProductRepository();
    listUseCase = new ListProductsUseCase(repository);
    createUseCase = new CreateProductUseCase(repository);
  });

  it("should return empty list when no products exist", async () => {
    const result = await listUseCase.execute();
    expect(result.products).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(12);
  });

  it("should return products with default pagination", async () => {
    for (let i = 1; i <= 5; i++) {
      await createUseCase.execute({
        name: `Product ${i}`,
        description: `Description for product ${i} here`,
        categoryId: "cat-001",
        priceCents: i * 10000,
        skuPrefix: `P${i}`,
      });
    }

    const result = await listUseCase.execute();

    expect(result.products).toHaveLength(5);
    expect(result.total).toBe(5);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(12);
  });

  it("should paginate products", async () => {
    for (let i = 1; i <= 5; i++) {
      await createUseCase.execute({
        name: `Product ${i}`,
        description: `Description for product ${i} here`,
        categoryId: "cat-001",
        priceCents: i * 10000,
        skuPrefix: `P${i}`,
      });
    }

    const page1 = await listUseCase.execute({ page: 1, limit: 2 });
    expect(page1.products).toHaveLength(2);
    expect(page1.total).toBe(5);

    const page2 = await listUseCase.execute({ page: 2, limit: 2 });
    expect(page2.products).toHaveLength(2);

    const page3 = await listUseCase.execute({ page: 3, limit: 2 });
    expect(page3.products).toHaveLength(1);
  });

  it("should filter by category", async () => {
    await createUseCase.execute({
      name: "Teclado",
      description: "Teclado mecânico de alta performance",
      categoryId: "cat-perifericos",
      priceCents: 50000,
      skuPrefix: "KB",
    });
    await createUseCase.execute({
      name: "Monitor",
      description: "Monitor UltraWide de alta performance",
      categoryId: "cat-monitores",
      priceCents: 200000,
      skuPrefix: "MN",
    });

    const result = await listUseCase.execute({ categoryId: "cat-perifericos" });

    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe("Teclado");
  });

  it("should search by name", async () => {
    await createUseCase.execute({
      name: "Teclado Mecânico RGB",
      description: "Teclado com iluminação RGB de alta performance",
      categoryId: "cat-001",
      priceCents: 50000,
      skuPrefix: "KB",
    });
    await createUseCase.execute({
      name: "Mouse Ergonômico",
      description: "Mouse com 26.000 DPI de alta performance",
      categoryId: "cat-001",
      priceCents: 30000,
      skuPrefix: "MS",
    });

    const result = await listUseCase.execute({ search: "teclado" });

    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toContain("Teclado");
  });

  it("should limit maximum items per page to 50", async () => {
    const result = await listUseCase.execute({ limit: 100 });
    expect(result.limit).toBe(50);
  });

  it("should filter products by priceMin", async () => {
    await createUseCase.execute({
      name: "Cheap Product",
      description: "A cheap product for testing price filter",
      categoryId: "cat-001",
      priceCents: 5000,
      skuPrefix: "CP",
    });
    await createUseCase.execute({
      name: "Expensive Product",
      description: "An expensive product for testing price filter",
      categoryId: "cat-001",
      priceCents: 50000,
      skuPrefix: "EP",
    });

    const result = await listUseCase.execute({ priceMin: 100 });
    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe("Expensive Product");
  });

  it("should filter products by priceMax", async () => {
    await createUseCase.execute({
      name: "Cheap Product",
      description: "A cheap product for testing price filter",
      categoryId: "cat-001",
      priceCents: 5000,
      skuPrefix: "CP",
    });
    await createUseCase.execute({
      name: "Expensive Product",
      description: "An expensive product for testing price filter",
      categoryId: "cat-001",
      priceCents: 50000,
      skuPrefix: "EP",
    });

    const result = await listUseCase.execute({ priceMax: 100 });
    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe("Cheap Product");
  });

  it("should filter products by both priceMin and priceMax", async () => {
    await createUseCase.execute({
      name: "Cheap Product",
      description: "A cheap product for testing price filter",
      categoryId: "cat-001",
      priceCents: 5000,
      skuPrefix: "CP",
    });
    await createUseCase.execute({
      name: "Mid Product",
      description: "A mid-range product for testing price filter",
      categoryId: "cat-001",
      priceCents: 25000,
      skuPrefix: "MP",
    });
    await createUseCase.execute({
      name: "Expensive Product",
      description: "An expensive product for testing price filter",
      categoryId: "cat-001",
      priceCents: 50000,
      skuPrefix: "EP",
    });

    const result = await listUseCase.execute({ priceMin: 100, priceMax: 300 });
    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe("Mid Product");
  });

  it("should return empty when no products match price range", async () => {
    await createUseCase.execute({
      name: "Cheap Product",
      description: "A cheap product for testing price filter",
      categoryId: "cat-001",
      priceCents: 5000,
      skuPrefix: "CP",
    });

    const result = await listUseCase.execute({ priceMin: 1000 });
    expect(result.products).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
