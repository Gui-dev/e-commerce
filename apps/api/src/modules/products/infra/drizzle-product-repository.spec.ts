import { beforeEach, describe, expect, it } from "vitest";
import { categories, products } from "../../../lib/db/schema.js";
import { db } from "../../../lib/db/test-db.js";
import {
  TEST_CATEGORY_ID,
  TEST_PRODUCT_ID,
  TEST_VARIANT_ID,
  resetDatabase,
  seedTestData,
} from "../../../lib/db/test-helpers.js";
import {
  ProductNotFoundError,
  ProductSkuConflictError,
  ProductSlugConflictError,
} from "../domain/product.js";
import { DrizzleProductRepository } from "./drizzle-product-repository.js";

describe("DrizzleProductRepository", () => {
  let repo: DrizzleProductRepository;

  beforeEach(async () => {
    await resetDatabase();
    repo = new DrizzleProductRepository(db);
  });

  describe("findById", () => {
    it("should return a product by id", async () => {
      await seedTestData();
      const found = await repo.findById(TEST_PRODUCT_ID);
      expect(found).toBeDefined();
      expect(found?.name).toBe("Test Product");
      expect(found?.slug).toBe("test-product");
      expect(found?.priceCents).toBe(1999);
    });

    it("should return null for non-existent id", async () => {
      const found = await repo.findById("00000000-0000-0000-0000-000000000000");
      expect(found).toBeNull();
    });
  });

  describe("findBySlug", () => {
    it("should return a product by slug", async () => {
      await seedTestData();
      const found = await repo.findBySlug("test-product");
      expect(found).toBeDefined();
      expect(found?.name).toBe("Test Product");
      expect(found?.id).toBe(TEST_PRODUCT_ID);
    });

    it("should return null for non-existent slug", async () => {
      const found = await repo.findBySlug("non-existent");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("should return empty list when no products exist", async () => {
      const result = await repo.list({ page: 1, limit: 10 });
      expect(result.products).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should list products with pagination", async () => {
      const catId = "11111111-1111-4111-8111-111111111111";
      const catId2 = "22222222-2222-4222-8222-222222222222";
      await db.insert(categories).values([
        { id: catId, name: "Cat A", slug: "cat-a" },
        { id: catId2, name: "Cat B", slug: "cat-b" },
      ]);

      for (let i = 1; i <= 5; i++) {
        await db.insert(products).values({
          name: `Product ${i}`,
          slug: `product-${i}`,
          description: `Description ${i}`,
          categoryId: i <= 3 ? catId : catId2,
          priceCents: i * 10000,
          skuPrefix: `PRD-0${i}`,
        });
      }

      const page1 = await repo.list({ page: 1, limit: 2 });
      expect(page1.products).toHaveLength(2);
      expect(page1.total).toBe(5);

      const page2 = await repo.list({ page: 2, limit: 2 });
      expect(page2.products).toHaveLength(2);

      const page3 = await repo.list({ page: 3, limit: 2 });
      expect(page3.products).toHaveLength(1);
    });

    it("should filter products by category", async () => {
      const catA = "33333333-3333-4333-8333-333333333333";
      const catB = "44444444-4444-4444-8444-444444444444";
      await db.insert(categories).values([
        { id: catA, name: "Periféricos", slug: "perifericos" },
        { id: catB, name: "Monitores", slug: "monitores" },
      ]);
      await db.insert(products).values([
        {
          name: "Teclado",
          slug: "teclado",
          description: "Teclado mecânico",
          categoryId: catA,
          priceCents: 50000,
          skuPrefix: "KB-01",
        },
        {
          name: "Monitor",
          slug: "monitor",
          description: "Monitor 4K",
          categoryId: catB,
          priceCents: 200000,
          skuPrefix: "MN-01",
        },
      ]);

      const result = await repo.list({ categoryId: catA, page: 1, limit: 10 });
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe("Teclado");
    });

    it("should search products by name", async () => {
      const catId = "55555555-5555-4555-8555-555555555555";
      await db.insert(categories).values({ id: catId, name: "Geral", slug: "geral" });
      await db.insert(products).values([
        {
          name: "Teclado Mecânico RGB",
          slug: "teclado-mecanico-rgb",
          description: "Switches Cherry MX",
          categoryId: catId,
          priceCents: 50000,
          skuPrefix: "KB-01",
        },
        {
          name: "Mouse Ergonômico",
          slug: "mouse-ergonomico",
          description: "26.000 DPI",
          categoryId: catId,
          priceCents: 30000,
          skuPrefix: "MS-01",
        },
      ]);

      const result = await repo.list({ search: "teclado", page: 1, limit: 10 });
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toContain("Teclado");
    });

    it("should search products by description", async () => {
      const catId = "66666666-6666-4666-8666-666666666666";
      await db.insert(categories).values({ id: catId, name: "Geral", slug: "geral-desc" });
      await db.insert(products).values([
        {
          name: "Item A",
          slug: "item-a",
          description: "Great mechanical keyboard",
          categoryId: catId,
          priceCents: 50000,
          skuPrefix: "A",
        },
        {
          name: "Item B",
          slug: "item-b",
          description: "Wireless mouse",
          categoryId: catId,
          priceCents: 30000,
          skuPrefix: "B",
        },
      ]);

      const result = await repo.list({ search: "mechanical", page: 1, limit: 10 });
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe("Item A");
    });
  });

  describe("create", () => {
    it("should create a product", async () => {
      await seedTestData();
      const created = await repo.create({
        name: "Teclado Mecânico",
        slug: "teclado-mecanico",
        description: "Switches óptico-magnéticos ajustáveis",
        categoryId: TEST_CATEGORY_ID,
        priceCents: 89990,
        skuPrefix: "KRN-KB",
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe("Teclado Mecânico");
      expect(created.slug).toBe("teclado-mecanico");
      expect(created.priceCents).toBe(89990);
      expect(created.isActive).toBe(true);
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
    });

    it("should store and retrieve a product by id", async () => {
      await seedTestData();
      const created = await repo.create({
        name: "Monitor UltraWide",
        slug: "monitor-ultrawide",
        description: "Painel QD-OLED de alta precisão",
        categoryId: TEST_CATEGORY_ID,
        priceCents: 279900,
        skuPrefix: "KRN-MN",
      });

      const found = await repo.findById(created.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe("Monitor UltraWide");
      expect(found?.priceCents).toBe(279900);
    });

    it("should reject duplicate slug", async () => {
      await seedTestData();
      await repo.create({
        name: "Product A",
        slug: "duplicate-slug",
        description: "First",
        categoryId: TEST_CATEGORY_ID,
        priceCents: 10000,
        skuPrefix: "A",
      });

      await expect(
        repo.create({
          name: "Product B",
          slug: "duplicate-slug",
          description: "Second",
          categoryId: TEST_CATEGORY_ID,
          priceCents: 20000,
          skuPrefix: "B",
        }),
      ).rejects.toThrow(ProductSlugConflictError);
    });

    it("should save imageUrl when provided", async () => {
      await seedTestData();
      const created = await repo.create({
        name: "Product with Image",
        slug: "product-with-image",
        description: "Has an image",
        categoryId: TEST_CATEGORY_ID,
        priceCents: 10000,
        skuPrefix: "IMG",
        imageUrl: "https://example.com/image.png",
      });

      expect(created.imageUrl).toBe("https://example.com/image.png");
    });

    it("should set imageUrl to null when not provided", async () => {
      await seedTestData();
      const created = await repo.create({
        name: "Product no Image",
        slug: "product-no-image",
        description: "No image",
        categoryId: TEST_CATEGORY_ID,
        priceCents: 10000,
        skuPrefix: "NOIMG",
      });

      expect(created.imageUrl).toBeNull();
    });
  });

  describe("update", () => {
    it("should update a product", async () => {
      await seedTestData();
      const updated = await repo.update(TEST_PRODUCT_ID, {
        name: "New Name",
        priceCents: 20000,
      });

      expect(updated.name).toBe("New Name");
      expect(updated.priceCents).toBe(20000);
      expect(updated.id).toBe(TEST_PRODUCT_ID);
    });

    it("should update the updatedAt timestamp", async () => {
      await seedTestData();
      const before = await repo.findById(TEST_PRODUCT_ID);
      const updated = await repo.update(TEST_PRODUCT_ID, { name: "Updated" });

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before!.updatedAt.getTime());
    });

    it("should throw ProductNotFoundError when updating non-existent product", async () => {
      await expect(
        repo.update("00000000-0000-0000-0000-000000000000", { name: "Nope" }),
      ).rejects.toThrow(ProductNotFoundError);
    });

    it("should allow setting imageUrl to null", async () => {
      await seedTestData();
      await repo.update(TEST_PRODUCT_ID, { imageUrl: "https://example.com/img.png" });
      const updated = await repo.update(TEST_PRODUCT_ID, { imageUrl: null });
      expect(updated.imageUrl).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete a product", async () => {
      await seedTestData();
      await repo.delete(TEST_PRODUCT_ID);
      const found = await repo.findById(TEST_PRODUCT_ID);
      expect(found).toBeNull();
    });

    it("should throw ProductNotFoundError when deleting non-existent product", async () => {
      await expect(repo.delete("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
        ProductNotFoundError,
      );
    });
  });

  describe("findVariantById", () => {
    it("should return a variant by id", async () => {
      await seedTestData();
      const found = await repo.findVariantById(TEST_VARIANT_ID);
      expect(found).toBeDefined();
      expect(found?.name).toBe("Default");
      expect(found?.sku).toBe("TEST-SKU-001");
      expect(found?.productId).toBe(TEST_PRODUCT_ID);
    });

    it("should return null for non-existent variant id", async () => {
      const found = await repo.findVariantById("00000000-0000-0000-0000-000000000000");
      expect(found).toBeNull();
    });
  });

  describe("findVariantsByProductId", () => {
    it("should return variants for a product", async () => {
      await seedTestData();
      const variants = await repo.findVariantsByProductId(TEST_PRODUCT_ID);
      expect(variants).toHaveLength(1);
      expect(variants[0].sku).toBe("TEST-SKU-001");
    });

    it("should return empty array for product with no variants", async () => {
      await seedTestData();
      const catId = "77777777-7777-4777-8777-777777777777";
      await db.insert(categories).values({ id: catId, name: "Cat", slug: "cat-novar" });
      const [product] = await db
        .insert(products)
        .values({
          name: "No Variants",
          slug: "no-variants",
          description: "No variants",
          categoryId: catId,
          priceCents: 1000,
          skuPrefix: "NV",
        })
        .returning();

      const variants = await repo.findVariantsByProductId(product.id);
      expect(variants).toEqual([]);
    });
  });

  describe("findVariantBySku", () => {
    it("should return a variant by sku", async () => {
      await seedTestData();
      const found = await repo.findVariantBySku("TEST-SKU-001");
      expect(found).toBeDefined();
      expect(found?.id).toBe(TEST_VARIANT_ID);
    });

    it("should return null for non-existent sku", async () => {
      const found = await repo.findVariantBySku("NOPE-SKU");
      expect(found).toBeNull();
    });
  });

  describe("createVariant", () => {
    it("should create a variant", async () => {
      await seedTestData();
      const variant = await repo.createVariant(TEST_PRODUCT_ID, {
        name: "Preto",
        sku: "TEST-BLK-001",
        priceCents: 1999,
        attributes: { color: "black" },
      });

      expect(variant.id).toBeDefined();
      expect(variant.productId).toBe(TEST_PRODUCT_ID);
      expect(variant.name).toBe("Preto");
      expect(variant.sku).toBe("TEST-BLK-001");
      expect(variant.priceCents).toBe(1999);
      expect(variant.attributes).toEqual({ color: "black" });
      expect(variant.isActive).toBe(true);
    });

    it("should create variant without optional fields", async () => {
      await seedTestData();
      const variant = await repo.createVariant(TEST_PRODUCT_ID, {
        name: "Default",
        sku: "TEST-DEF-001",
      });

      expect(variant.priceCents).toBeNull();
      expect(variant.attributes).toBeNull();
    });

    it("should reject duplicate SKU", async () => {
      await seedTestData();
      await repo.createVariant(TEST_PRODUCT_ID, {
        name: "Variant A",
        sku: "DUP-SKU",
      });

      await expect(
        repo.createVariant(TEST_PRODUCT_ID, {
          name: "Variant B",
          sku: "DUP-SKU",
        }),
      ).rejects.toThrow(ProductSkuConflictError);
    });

    it("should create and retrieve variants by product id", async () => {
      await seedTestData();
      await repo.createVariant(TEST_PRODUCT_ID, {
        name: "Preto",
        sku: "TEST-COLOR-001",
        attributes: { color: "black" },
      });

      const variants = await repo.findVariantsByProductId(TEST_PRODUCT_ID);
      expect(variants).toHaveLength(2);
      expect(variants.map((v) => v.sku)).toContain("TEST-COLOR-001");
    });
  });

  describe("updateVariant", () => {
    it("should update a variant", async () => {
      await seedTestData();
      const updated = await repo.updateVariant(TEST_VARIANT_ID, {
        name: "Updated Default",
        priceCents: 2999,
      });

      expect(updated.name).toBe("Updated Default");
      expect(updated.priceCents).toBe(2999);
      expect(updated.id).toBe(TEST_VARIANT_ID);
    });

    it("should update variant attributes", async () => {
      await seedTestData();
      const updated = await repo.updateVariant(TEST_VARIANT_ID, {
        attributes: { color: "red", size: "L" },
      });

      expect(updated.attributes).toEqual({ color: "red", size: "L" });
    });

    it("should update variant isActive", async () => {
      await seedTestData();
      const updated = await repo.updateVariant(TEST_VARIANT_ID, { isActive: false });
      expect(updated.isActive).toBe(false);
    });

    it("should throw ProductNotFoundError when updating non-existent variant", async () => {
      await expect(
        repo.updateVariant("00000000-0000-0000-0000-000000000000", { name: "Nope" }),
      ).rejects.toThrow(ProductNotFoundError);
    });
  });

  describe("deleteVariant", () => {
    it("should delete a variant", async () => {
      await seedTestData();
      await repo.deleteVariant(TEST_VARIANT_ID);
      const found = await repo.findVariantById(TEST_VARIANT_ID);
      expect(found).toBeNull();
    });

    it("should throw ProductNotFoundError when deleting non-existent variant", async () => {
      await expect(repo.deleteVariant("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
        ProductNotFoundError,
      );
    });
  });

  describe("constructor", () => {
    it("should accept a custom db client", async () => {
      await seedTestData();
      const customRepo = new DrizzleProductRepository(db);
      const found = await customRepo.findById(TEST_PRODUCT_ID);
      expect(found).toBeDefined();
    });
  });
});
