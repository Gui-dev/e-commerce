import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { orders, payments, users } from "../../../lib/db/schema.js";
import { db } from "../../../lib/db/test-db.js";
import { resetDatabase, seedTestData } from "../../../lib/db/test-helpers.js";
import { DrizzlePaymentRepository } from "./drizzle-payment-repository.js";

const TEST_PAYMENT_USER_ID = "ffffffff-0000-4000-8000-000000000001";
const TEST_PAYMENT_ORDER_ID = "ffffffff-0000-4000-8000-000000000002";

describe("DrizzlePaymentRepository", () => {
  let repo: DrizzlePaymentRepository;

  async function createOrder(): Promise<void> {
    await db.insert(orders).values({
      id: TEST_PAYMENT_ORDER_ID,
      userId: TEST_PAYMENT_USER_ID,
      status: "pending",
      subtotalCents: 3998,
      discountCents: 0,
      totalCents: 3998,
    });
  }

  async function createPayment(overrides: { amountCents?: number } = {}) {
    return repo.create({
      orderId: TEST_PAYMENT_ORDER_ID,
      method: "credit_card",
      amountCents: overrides.amountCents ?? 3998,
    });
  }

  beforeEach(async () => {
    await resetDatabase();
    repo = new DrizzlePaymentRepository(db);
    await seedTestData();
    await db.insert(users).values({
      id: TEST_PAYMENT_USER_ID,
      name: "Test User",
      email: "payment-test@example.com",
      emailVerified: true,
      role: "customer",
    });
    await createOrder();
  });

  describe("create", () => {
    it("should create a pending payment", async () => {
      const payment = await createPayment();

      expect(payment.id).toBeDefined();
      expect(payment.orderId).toBe(TEST_PAYMENT_ORDER_ID);
      expect(payment.method).toBe("credit_card");
      expect(payment.status).toBe("pending");
      expect(payment.amountCents).toBe(3998);
      expect(payment.externalId).toBeNull();
      expect(payment.idempotencyKey).toBeNull();
      expect(payment.paidAt).toBeNull();
      expect(payment.createdAt).toBeInstanceOf(Date);
      expect(payment.updatedAt).toBeInstanceOf(Date);
    });

    it("should persist the payment to the database", async () => {
      const payment = await createPayment();
      const stored = await db.query.payments.findFirst({
        where: (p, { eq: eqFn }) => eqFn(p.id, payment.id),
      });
      expect(stored).toBeDefined();
      expect(stored?.amountCents).toBe(3998);
      expect(stored?.status).toBe("pending");
    });
  });

  describe("findById", () => {
    it("should return a payment by id", async () => {
      const payment = await createPayment();
      const found = await repo.findById(payment.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(payment.id);
      expect(found?.orderId).toBe(TEST_PAYMENT_ORDER_ID);
      expect(found?.method).toBe("credit_card");
    });

    it("should return null for non-existent id", async () => {
      const found = await repo.findById("00000000-0000-0000-0000-000000000000");
      expect(found).toBeNull();
    });
  });

  describe("findByOrderId", () => {
    it("should return the payment matching the order id", async () => {
      const payment = await createPayment();
      const found = await repo.findByOrderId(TEST_PAYMENT_ORDER_ID);
      expect(found).toBeDefined();
      expect(found?.id).toBe(payment.id);
    });

    it("should return null when order has no payment", async () => {
      const found = await repo.findByOrderId("00000000-0000-0000-0000-000000000000");
      expect(found).toBeNull();
    });
  });

  describe("findByIdempotencyKey", () => {
    it("should return the payment with a matching idempotency key", async () => {
      const payment = await createPayment();
      await db
        .update(payments)
        .set({ idempotencyKey: "pay-key-abc" })
        .where(eq(payments.id, payment.id));

      const found = await repo.findByIdempotencyKey("pay-key-abc");
      expect(found).toBeDefined();
      expect(found?.id).toBe(payment.id);
    });

    it("should return null when no payment matches the key", async () => {
      const found = await repo.findByIdempotencyKey("missing-key");
      expect(found).toBeNull();
    });
  });

  describe("updateStatus", () => {
    it("should update the payment status", async () => {
      const payment = await createPayment();
      const updated = await repo.updateStatus(payment.id, "approved", "ext-123");
      expect(updated.status).toBe("approved");
      expect(updated.externalId).toBe("ext-123");
      expect(updated.id).toBe(payment.id);
    });

    it("should set paidAt when approved", async () => {
      const payment = await createPayment();
      expect(payment.paidAt).toBeNull();
      const updated = await repo.updateStatus(payment.id, "approved");
      expect(updated.paidAt).toBeInstanceOf(Date);
    });

    it("should not set paidAt for non-approved status", async () => {
      const payment = await createPayment();
      const updated = await repo.updateStatus(payment.id, "processing");
      expect(updated.paidAt).toBeNull();
    });

    it("should keep externalId when not provided", async () => {
      const payment = await createPayment();
      await repo.updateStatus(payment.id, "processing", "ext-777");
      const updated = await repo.updateStatus(payment.id, "approved");
      expect(updated.externalId).toBe("ext-777");
    });

    it("should throw when payment does not exist", async () => {
      await expect(
        repo.updateStatus("00000000-0000-0000-0000-000000000000", "approved"),
      ).rejects.toThrow("Payment not found");
    });
  });

  describe("constructor", () => {
    it("should accept a custom db client", async () => {
      const customRepo = new DrizzlePaymentRepository(db);
      const payment = await customRepo.create({
        orderId: TEST_PAYMENT_ORDER_ID,
        method: "pix",
        amountCents: 2500,
      });
      expect(payment.id).toBeDefined();
      expect(payment.method).toBe("pix");
    });
  });
});
