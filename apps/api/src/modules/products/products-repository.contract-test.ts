import { beforeEach, describe, expect, it } from "vitest";
import type { ProductRepository } from "./domain/product-repository.js";

export function runProductRepositoryContractSuite(
  label: string,
  makeRepository: () => Promise<ProductRepository>,
) {
  describe(label, () => {
    let repository: ProductRepository;

    beforeEach(async () => {
      repository = await makeRepository();
    });

    it("should store and retrieve a product by id", async () => {
      const created = await repository.create({
        name: "Teclado Mecânico",
        slug: "teclado-mecanico",
        description: "Switches óptico-magnéticos ajustáveis",
        categoryId: "cat-001",
        priceCents: 89990,
        skuPrefix: "KRN-KB",
      });

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe("Teclado Mecânico");
      expect(found?.slug).toBe("teclado-mecanico");
      expect(found?.priceCents).toBe(89990);
    });

    it("should retrieve a product by slug", async () => {
      await repository.create({
        name: "Monitor UltraWide",
        slug: "monitor-ultrawide",
        description: "Painel QD-OLED de alta precisão",
        categoryId: "cat-002",
        priceCents: 279900,
        skuPrefix: "KRN-MN",
      });

      const found = await repository.findBySlug("monitor-ultrawide");

      expect(found).toBeDefined();
      expect(found?.name).toBe("Monitor UltraWide");
    });

    it("should return null for non-existent slug", async () => {
      const found = await repository.findBySlug("non-existent");
      expect(found).toBeNull();
    });

    it("should list products with pagination", async () => {
      for (let i = 1; i <= 5; i++) {
        await repository.create({
          name: `Product ${i}`,
          slug: `product-${i}`,
          description: `Description ${i}`,
          categoryId: "cat-001",
          priceCents: i * 10000,
          skuPrefix: `PRD-0${i}`,
        });
      }

      const page1 = await repository.list({ page: 1, limit: 2 });
      expect(page1.products).toHaveLength(2);
      expect(page1.total).toBe(5);

      const page2 = await repository.list({ page: 2, limit: 2 });
      expect(page2.products).toHaveLength(2);

      const page3 = await repository.list({ page: 3, limit: 2 });
      expect(page3.products).toHaveLength(1);
    });

    it("should filter products by category", async () => {
      await repository.create({
        name: "Teclado",
        slug: "teclado",
        description: "Teclado mecânico",
        categoryId: "cat-perifericos",
        priceCents: 50000,
        skuPrefix: "KB-01",
      });
      await repository.create({
        name: "Monitor",
        slug: "monitor",
        description: "Monitor 4K",
        categoryId: "cat-monitores",
        priceCents: 200000,
        skuPrefix: "MN-01",
      });

      const result = await repository.list({ categoryId: "cat-perifericos", page: 1, limit: 10 });

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe("Teclado");
    });

    it("should search products by name", async () => {
      await repository.create({
        name: "Teclado Mecânico RGB",
        slug: "teclado-mecanico-rgb",
        description: "Switches Cherry MX",
        categoryId: "cat-001",
        priceCents: 50000,
        skuPrefix: "KB-01",
      });
      await repository.create({
        name: "Mouse Ergonômico",
        slug: "mouse-ergonomico",
        description: "26.000 DPI",
        categoryId: "cat-001",
        priceCents: 30000,
        skuPrefix: "MS-01",
      });

      const result = await repository.list({ search: "teclado", page: 1, limit: 10 });

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toContain("Teclado");
    });

    it("should update a product", async () => {
      const created = await repository.create({
        name: "Old Name",
        slug: "old-name",
        description: "Old description",
        categoryId: "cat-001",
        priceCents: 10000,
        skuPrefix: "OLD",
      });

      const updated = await repository.update(created.id, {
        name: "New Name",
        priceCents: 20000,
      });

      expect(updated.name).toBe("New Name");
      expect(updated.priceCents).toBe(20000);
    });

    it("should delete a product", async () => {
      const created = await repository.create({
        name: "To Delete",
        slug: "to-delete",
        description: "Will be deleted",
        categoryId: "cat-001",
        priceCents: 10000,
        skuPrefix: "DEL",
      });

      await repository.delete(created.id);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it("should create and retrieve variants", async () => {
      const product = await repository.create({
        name: "Mouse",
        slug: "mouse",
        description: "Mouse gamer",
        categoryId: "cat-001",
        priceCents: 30000,
        skuPrefix: "MS",
      });

      const _variant = await repository.createVariant(product.id, {
        name: "Preto",
        sku: "MS-BLK",
        attributes: { color: "black" },
      });

      const variants = await repository.findVariantsByProductId(product.id);
      expect(variants).toHaveLength(1);
      expect(variants[0].sku).toBe("MS-BLK");
    });

    it("should reject duplicate slug", async () => {
      await repository.create({
        name: "Product A",
        slug: "duplicate-slug",
        description: "First",
        categoryId: "cat-001",
        priceCents: 10000,
        skuPrefix: "A",
      });

      await expect(
        repository.create({
          name: "Product B",
          slug: "duplicate-slug",
          description: "Second",
          categoryId: "cat-001",
          priceCents: 20000,
          skuPrefix: "B",
        }),
      ).rejects.toThrow("already exists");
    });

    it("should reject duplicate SKU", async () => {
      const product = await repository.create({
        name: "Product",
        slug: "product",
        description: "Test",
        categoryId: "cat-001",
        priceCents: 10000,
        skuPrefix: "P",
      });

      await repository.createVariant(product.id, {
        name: "Variant A",
        sku: "DUP-SKU",
      });

      await expect(
        repository.createVariant(product.id, {
          name: "Variant B",
          sku: "DUP-SKU",
        }),
      ).rejects.toThrow("already exists");
    });
  });
}
