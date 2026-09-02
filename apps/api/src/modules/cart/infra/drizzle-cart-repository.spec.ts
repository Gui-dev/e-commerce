import { beforeEach, describe, expect, it } from "vitest";
import { users } from "../../../lib/db/schema.js";
import { db } from "../../../lib/db/test-db.js";
import { TEST_VARIANT_ID, resetDatabase, seedTestData } from "../../../lib/db/test-helpers.js";
import { CartItemNotFoundError, CartNotFoundError } from "../domain/cart.js";
import { DrizzleCartRepository } from "./drizzle-cart-repository.js";

const TEST_USER_ID = "eeeeeeee-0000-4000-8000-000000000005";

describe("DrizzleCartRepository", () => {
  let repo: DrizzleCartRepository;

  beforeEach(async () => {
    await resetDatabase();
    repo = new DrizzleCartRepository(db);
    await seedTestData();
    await db.insert(users).values({
      id: TEST_USER_ID,
      name: "Test User",
      email: "test-user@example.com",
      emailVerified: true,
      role: "customer",
    });
  });

  describe("create", () => {
    it("should create a cart for a user", async () => {
      const cart = await repo.create(TEST_USER_ID);
      expect(cart.id).toBeDefined();
      expect(cart.userId).toBe(TEST_USER_ID);
      expect(cart.couponId).toBeNull();
      expect(cart.items).toEqual([]);
      expect(cart.createdAt).toBeInstanceOf(Date);
      expect(cart.updatedAt).toBeInstanceOf(Date);
    });

    it("should return existing cart if user already has one", async () => {
      const first = await repo.create(TEST_USER_ID);
      const second = await repo.create(TEST_USER_ID);
      expect(second.id).toBe(first.id);
    });
  });

  describe("findByUserId", () => {
    it("should return null when user has no cart", async () => {
      const cart = await repo.findByUserId(TEST_USER_ID);
      expect(cart).toBeNull();
    });

    it("should return the cart with its items", async () => {
      const cart = await repo.create(TEST_USER_ID);
      await repo.addItem(cart.id, { variantId: TEST_VARIANT_ID, quantity: 2 });

      const found = await repo.findByUserId(TEST_USER_ID);
      expect(found).toBeDefined();
      expect(found?.id).toBe(cart.id);
      expect(found?.items).toHaveLength(1);
      expect(found?.items[0].variantId).toBe(TEST_VARIANT_ID);
      expect(found?.items[0].quantity).toBe(2);
    });
  });

  describe("findItemById", () => {
    it("should return a cart item by id", async () => {
      const cart = await repo.create(TEST_USER_ID);
      const item = await repo.addItem(cart.id, { variantId: TEST_VARIANT_ID, quantity: 3 });

      const found = await repo.findItemById(item.id);
      expect(found).toBeDefined();
      expect(found?.cartId).toBe(cart.id);
      expect(found?.variantId).toBe(TEST_VARIANT_ID);
      expect(found?.quantity).toBe(3);
      expect(found?.addedAt).toBeInstanceOf(Date);
    });

    it("should return null for non-existent item id", async () => {
      const found = await repo.findItemById("00000000-0000-0000-0000-000000000000");
      expect(found).toBeNull();
    });
  });

  describe("addItem", () => {
    it("should add an item to the cart", async () => {
      const cart = await repo.create(TEST_USER_ID);
      const item = await repo.addItem(cart.id, { variantId: TEST_VARIANT_ID, quantity: 1 });

      expect(item.cartId).toBe(cart.id);
      expect(item.variantId).toBe(TEST_VARIANT_ID);
      expect(item.quantity).toBe(1);
      expect(item.id).toBeDefined();
    });

    it("should increment quantity when item already exists for the variant", async () => {
      const cart = await repo.create(TEST_USER_ID);
      await repo.addItem(cart.id, { variantId: TEST_VARIANT_ID, quantity: 2 });
      const updated = await repo.addItem(cart.id, { variantId: TEST_VARIANT_ID, quantity: 3 });

      expect(updated.quantity).toBe(5);
    });

    it("should throw CartNotFoundError when cart does not exist", async () => {
      await expect(
        repo.addItem("00000000-0000-0000-0000-000000000000", {
          variantId: TEST_VARIANT_ID,
          quantity: 1,
        }),
      ).rejects.toThrow(CartNotFoundError);
    });
  });

  describe("updateItem", () => {
    it("should update the quantity of an item", async () => {
      const cart = await repo.create(TEST_USER_ID);
      const item = await repo.addItem(cart.id, { variantId: TEST_VARIANT_ID, quantity: 1 });

      const updated = await repo.updateItem(item.id, { quantity: 4 });
      expect(updated.quantity).toBe(4);
      expect(updated.id).toBe(item.id);
    });

    it("should throw CartItemNotFoundError for non-existent item", async () => {
      await expect(
        repo.updateItem("00000000-0000-0000-0000-000000000000", { quantity: 2 }),
      ).rejects.toThrow(CartItemNotFoundError);
    });
  });

  describe("removeItem", () => {
    it("should remove an item from the cart", async () => {
      const cart = await repo.create(TEST_USER_ID);
      const item = await repo.addItem(cart.id, { variantId: TEST_VARIANT_ID, quantity: 1 });

      await repo.removeItem(item.id);
      const found = await repo.findItemById(item.id);
      expect(found).toBeNull();
    });

    it("should throw CartItemNotFoundError for non-existent item", async () => {
      await expect(repo.removeItem("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
        CartItemNotFoundError,
      );
    });
  });

  describe("clearCart", () => {
    it("should remove all items from the cart", async () => {
      const cart = await repo.create(TEST_USER_ID);
      await repo.addItem(cart.id, { variantId: TEST_VARIANT_ID, quantity: 1 });
      await repo.addItem(cart.id, { variantId: TEST_VARIANT_ID, quantity: 1 });

      await repo.clearCart(cart.id);
      const found = await repo.findByUserId(TEST_USER_ID);
      expect(found?.items).toEqual([]);
    });
  });

  describe("findCartItemByVariantId", () => {
    it("should return the item matching the variant id", async () => {
      const cart = await repo.create(TEST_USER_ID);
      await repo.addItem(cart.id, { variantId: TEST_VARIANT_ID, quantity: 2 });

      const found = await repo.findCartItemByVariantId(cart.id, TEST_VARIANT_ID);
      expect(found).toBeDefined();
      expect(found?.quantity).toBe(2);
    });

    it("should return null when no item matches the variant", async () => {
      const cart = await repo.create(TEST_USER_ID);
      const found = await repo.findCartItemByVariantId(cart.id, TEST_VARIANT_ID);
      expect(found).toBeNull();
    });
  });
});
