import { beforeEach, describe, expect, it } from "vitest";
import { users } from "../../../lib/db/schema.js";
import { db } from "../../../lib/db/test-db.js";
import { TEST_VARIANT_ID, resetDatabase, seedTestData } from "../../../lib/db/test-helpers.js";
import { OrderNotFoundError } from "../domain/order.js";
import { DrizzleOrderRepository } from "./drizzle-order-repository.js";

const TEST_USER_ID = "eeeeeeee-0000-4000-8000-000000000005";

describe("DrizzleOrderRepository", () => {
  let repo: DrizzleOrderRepository;

  const baseItems = [{ variantId: TEST_VARIANT_ID, quantity: 2, unitPriceCents: 1999 }];

  async function createOrder(overrides: { idempotencyKey?: string; discountCents?: number } = {}) {
    return repo.create({
      userId: TEST_USER_ID,
      items: baseItems,
      idempotencyKey: overrides.idempotencyKey,
      discountCents: overrides.discountCents,
    });
  }

  beforeEach(async () => {
    await resetDatabase();
    repo = new DrizzleOrderRepository(db);
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
    it("should create an order and compute totals", async () => {
      const order = await createOrder();

      expect(order.id).toBeDefined();
      expect(order.userId).toBe(TEST_USER_ID);
      expect(order.status).toBe("pending");
      expect(order.subtotalCents).toBe(3998);
      expect(order.discountCents).toBe(0);
      expect(order.totalCents).toBe(3998);
      expect(order.couponId).toBeNull();
      expect(order.idempotencyKey).toBeNull();
      expect(order.createdAt).toBeInstanceOf(Date);
      expect(order.updatedAt).toBeInstanceOf(Date);
    });

    it("should apply discount to the total", async () => {
      const order = await createOrder({ discountCents: 500 });
      expect(order.subtotalCents).toBe(3998);
      expect(order.discountCents).toBe(500);
      expect(order.totalCents).toBe(3498);
    });

    it("should store an idempotency key", async () => {
      const order = await createOrder({ idempotencyKey: "key-123" });
      expect(order.idempotencyKey).toBe("key-123");
    });

    it("should persist the order to the database", async () => {
      const order = await createOrder();
      const stored = await db.query.orders.findFirst({ where: (o, { eq }) => eq(o.id, order.id) });
      expect(stored).toBeDefined();
      expect(stored?.totalCents).toBe(3998);
    });
  });

  describe("findById", () => {
    it("should return an order by id", async () => {
      const order = await createOrder();
      const found = await repo.findById(order.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(order.id);
      expect(found?.userId).toBe(TEST_USER_ID);
      expect(found?.status).toBe("pending");
    });

    it("should return null for non-existent id", async () => {
      const found = await repo.findById("00000000-0000-0000-0000-000000000000");
      expect(found).toBeNull();
    });
  });

  describe("findByUserId", () => {
    it("should return orders belonging to the user", async () => {
      const orderA = await createOrder();
      const orderB = await createOrder();

      const found = await repo.findByUserId(TEST_USER_ID);
      expect(found).toHaveLength(2);
      expect(found.map((o) => o.id)).toEqual(expect.arrayContaining([orderA.id, orderB.id]));
    });

    it("should return empty array when user has no orders", async () => {
      const found = await repo.findByUserId(TEST_USER_ID);
      expect(found).toEqual([]);
    });
  });

  describe("findByIdempotencyKey", () => {
    it("should return the order matching the idempotency key", async () => {
      const order = await createOrder({ idempotencyKey: "key-abc" });
      const found = await repo.findByIdempotencyKey("key-abc");
      expect(found).toBeDefined();
      expect(found?.id).toBe(order.id);
    });

    it("should return null when no order matches the key", async () => {
      const found = await repo.findByIdempotencyKey("missing-key");
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("should return empty list when no orders exist", async () => {
      const orders = await repo.list();
      expect(orders).toEqual([]);
    });

    it("should list all orders", async () => {
      await createOrder();
      await createOrder();
      const orders = await repo.list();
      expect(orders).toHaveLength(2);
    });
  });

  describe("addItems", () => {
    it("should add items to an order", async () => {
      const order = await createOrder();
      const items = await repo.addItems(order.id, [
        { variantId: TEST_VARIANT_ID, quantity: 3, unitPriceCents: 1999 },
        { variantId: TEST_VARIANT_ID, quantity: 1, unitPriceCents: 5000 },
      ]);

      expect(items).toHaveLength(2);
      expect(items[0].orderId).toBe(order.id);
      expect(items[0].variantId).toBe(TEST_VARIANT_ID);
      expect(items[0].quantity).toBe(3);
      expect(items[0].unitPriceCents).toBe(1999);
      expect(items[1].unitPriceCents).toBe(5000);
    });

    it("should persist the added items", async () => {
      const order = await createOrder();
      await repo.addItems(order.id, [
        { variantId: TEST_VARIANT_ID, quantity: 4, unitPriceCents: 1999 },
      ]);

      const stored = await db.query.orderItems.findMany({
        where: (i, { eq: eqFn }) => eqFn(i.orderId, order.id),
      });
      expect(stored).toHaveLength(1);
      expect(stored[0].quantity).toBe(4);
    });

    it("should throw OrderNotFoundError when order does not exist", async () => {
      await expect(
        repo.addItems("00000000-0000-0000-0000-000000000000", [
          { variantId: TEST_VARIANT_ID, quantity: 1, unitPriceCents: 100 },
        ]),
      ).rejects.toThrow(OrderNotFoundError);
    });
  });

  describe("updateStatus", () => {
    it("should update the order status", async () => {
      const order = await createOrder();
      const updated = await repo.updateStatus(order.id, "paid");
      expect(updated.status).toBe("paid");
      expect(updated.id).toBe(order.id);
    });

    it("should update the updatedAt timestamp", async () => {
      const order = await createOrder();
      const before = order.updatedAt.getTime();
      const updated = await repo.updateStatus(order.id, "shipped");
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    });

    it("should throw OrderNotFoundError when order does not exist", async () => {
      await expect(
        repo.updateStatus("00000000-0000-0000-0000-000000000000", "paid"),
      ).rejects.toThrow(OrderNotFoundError);
    });
  });

  describe("constructor", () => {
    it("should accept a custom db client", async () => {
      const customRepo = new DrizzleOrderRepository(db);
      const order = await customRepo.create({
        userId: TEST_USER_ID,
        items: baseItems,
      });
      expect(order.id).toBeDefined();
    });
  });
});
