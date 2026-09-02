import { beforeEach, describe, expect, it } from "vitest";
import { categories, productVariants, products } from "../../../lib/db/schema.js";
import { db } from "../../../lib/db/test-db.js";
import {
  TEST_CATEGORY_ID,
  TEST_PRODUCT_ID,
  TEST_STOCK_ID,
  TEST_VARIANT_ID,
  resetDatabase,
  seedTestData,
} from "../../../lib/db/test-helpers.js";
import { InsufficientStockError, StockNotFoundError } from "../domain/stock.js";
import { DrizzleStockRepository } from "./drizzle-stock-repository.js";

describe("DrizzleStockRepository", () => {
  let repo: DrizzleStockRepository;

  beforeEach(async () => {
    await resetDatabase();
    repo = new DrizzleStockRepository(db);
  });

  describe("findByVariantId", () => {
    it("should return stock by variant id", async () => {
      await seedTestData();
      const found = await repo.findByVariantId(TEST_VARIANT_ID);
      expect(found).toBeDefined();
      expect(found?.id).toBe(TEST_STOCK_ID);
      expect(found?.variantId).toBe(TEST_VARIANT_ID);
      expect(found?.quantity).toBe(100);
      expect(found?.reserved).toBe(0);
    });

    it("should return null for non-existent variant id", async () => {
      const found = await repo.findByVariantId("00000000-0000-0000-0000-000000000000");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("should return empty list when no stock exists", async () => {
      const result = await repo.list();
      expect(result).toEqual([]);
    });

    it("should list all stock entries", async () => {
      await seedTestData();
      const result = await repo.list();
      expect(result).toHaveLength(1);
      expect(result[0].variantId).toBe(TEST_VARIANT_ID);
    });
  });

  describe("create", () => {
    const NEW_VARIANT_ID = "11111111-1111-4111-8111-111111111111";

    async function seedVariantForCreate() {
      await db.insert(categories).values({
        id: TEST_CATEGORY_ID,
        name: "Test Category",
        slug: "test-category-create",
      });
      await db.insert(products).values({
        id: TEST_PRODUCT_ID,
        name: "Test Product",
        slug: "test-product-create",
        description: "A test product",
        categoryId: TEST_CATEGORY_ID,
        priceCents: 1999,
        skuPrefix: "TEST",
      });
      await db.insert(productVariants).values({
        id: NEW_VARIANT_ID,
        productId: TEST_PRODUCT_ID,
        name: "New Variant",
        sku: "NEW-SKU-001",
      });
    }

    it("should create stock with default quantity", async () => {
      await seedVariantForCreate();
      const created = await repo.create(NEW_VARIANT_ID);
      expect(created.id).toBeDefined();
      expect(created.variantId).toBe(NEW_VARIANT_ID);
      expect(created.quantity).toBe(0);
      expect(created.reserved).toBe(0);
      expect(created.updatedAt).toBeInstanceOf(Date);
    });

    it("should create stock with custom initial quantity", async () => {
      await seedVariantForCreate();
      const created = await repo.create(NEW_VARIANT_ID, 50);
      expect(created.quantity).toBe(50);
    });

    it("should return existing stock if variant already has stock", async () => {
      await seedTestData();
      const existing = await repo.create(TEST_VARIANT_ID, 999);
      expect(existing.id).toBe(TEST_STOCK_ID);
      expect(existing.quantity).toBe(100);
    });
  });

  describe("addQuantity", () => {
    it("should increase stock quantity", async () => {
      await seedTestData();
      const updated = await repo.addQuantity(TEST_VARIANT_ID, 25);
      expect(updated.quantity).toBe(125);
      expect(updated.reserved).toBe(0);
    });

    it("should throw StockNotFoundError for non-existent variant", async () => {
      await expect(repo.addQuantity("00000000-0000-0000-0000-000000000000", 10)).rejects.toThrow(
        StockNotFoundError,
      );
    });
  });

  describe("reserve", () => {
    it("should increase reserved quantity", async () => {
      await seedTestData();
      const updated = await repo.reserve(TEST_VARIANT_ID, 10);
      expect(updated.quantity).toBe(100);
      expect(updated.reserved).toBe(10);
    });

    it("should throw InsufficientStockError when not enough available", async () => {
      await seedTestData();
      await expect(repo.reserve(TEST_VARIANT_ID, 200)).rejects.toThrow(InsufficientStockError);
    });

    it("should throw StockNotFoundError for non-existent variant", async () => {
      await expect(repo.reserve("00000000-0000-0000-0000-000000000000", 10)).rejects.toThrow(
        StockNotFoundError,
      );
    });
  });

  describe("releaseReservation", () => {
    it("should decrease reserved quantity", async () => {
      await seedTestData();
      await repo.reserve(TEST_VARIANT_ID, 20);
      const released = await repo.releaseReservation(TEST_VARIANT_ID, 10);
      expect(released.reserved).toBe(10);
      expect(released.quantity).toBe(100);
    });

    it("should not go below zero reserved", async () => {
      await seedTestData();
      const released = await repo.releaseReservation(TEST_VARIANT_ID, 100);
      expect(released.reserved).toBe(0);
    });

    it("should throw StockNotFoundError for non-existent variant", async () => {
      await expect(
        repo.releaseReservation("00000000-0000-0000-0000-000000000000", 10),
      ).rejects.toThrow(StockNotFoundError);
    });
  });

  describe("confirmSale", () => {
    it("should decrease quantity and reserved", async () => {
      await seedTestData();
      await repo.reserve(TEST_VARIANT_ID, 15);
      const confirmed = await repo.confirmSale(TEST_VARIANT_ID, 15);
      expect(confirmed.quantity).toBe(85);
      expect(confirmed.reserved).toBe(0);
    });

    it("should only decrease quantity when reserved is less than quantity", async () => {
      await seedTestData();
      await repo.reserve(TEST_VARIANT_ID, 5);
      const confirmed = await repo.confirmSale(TEST_VARIANT_ID, 10);
      expect(confirmed.quantity).toBe(90);
      expect(confirmed.reserved).toBe(0);
    });

    it("should throw StockNotFoundError for non-existent variant", async () => {
      await expect(repo.confirmSale("00000000-0000-0000-0000-000000000000", 10)).rejects.toThrow(
        StockNotFoundError,
      );
    });
  });

  describe("getMovements", () => {
    it("should return empty array when no movements exist", async () => {
      await seedTestData();
      const movements = await repo.getMovements(TEST_VARIANT_ID);
      expect(movements).toEqual([]);
    });

    it("should return movements for a variant", async () => {
      await seedTestData();
      await repo.addMovement({
        variantId: TEST_VARIANT_ID,
        type: "restock",
        quantity: 50,
        referenceId: null,
        notes: "Initial restock",
      });
      await repo.addMovement({
        variantId: TEST_VARIANT_ID,
        type: "sale",
        quantity: 10,
        referenceId: null,
        notes: null,
      });

      const movements = await repo.getMovements(TEST_VARIANT_ID);
      expect(movements).toHaveLength(2);
      expect(movements[0].type).toBe("restock");
      expect(movements[0].quantity).toBe(50);
      expect(movements[1].type).toBe("sale");
      expect(movements[1].quantity).toBe(10);
    });
  });

  describe("addMovement", () => {
    it("should add a stock movement", async () => {
      await seedTestData();
      const movement = await repo.addMovement({
        variantId: TEST_VARIANT_ID,
        type: "restock",
        quantity: 30,
        referenceId: null,
        notes: "Supplier delivery",
      });

      expect(movement.id).toBeDefined();
      expect(movement.variantId).toBe(TEST_VARIANT_ID);
      expect(movement.type).toBe("restock");
      expect(movement.quantity).toBe(30);
      expect(movement.notes).toBe("Supplier delivery");
      expect(movement.createdAt).toBeInstanceOf(Date);
    });

    it("should handle null optional fields", async () => {
      await seedTestData();
      const movement = await repo.addMovement({
        variantId: TEST_VARIANT_ID,
        type: "adjustment",
        quantity: -5,
        referenceId: null,
        notes: null,
      });

      expect(movement.referenceId).toBeNull();
      expect(movement.notes).toBeNull();
    });
  });

  describe("constructor", () => {
    it("should accept a custom db client", async () => {
      await seedTestData();
      const customRepo = new DrizzleStockRepository(db);
      const found = await customRepo.findByVariantId(TEST_VARIANT_ID);
      expect(found).toBeDefined();
    });
  });
});
