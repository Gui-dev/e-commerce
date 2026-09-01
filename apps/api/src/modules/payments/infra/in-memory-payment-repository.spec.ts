import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryPaymentRepository } from "./in-memory-payment-repository.js";

describe("InMemoryPaymentRepository", () => {
  let repository: InMemoryPaymentRepository;

  beforeEach(() => {
    repository = new InMemoryPaymentRepository();
  });

  it("should create a payment", async () => {
    const payment = await repository.create({
      orderId: "order-001",
      method: "pix",
      amountCents: 10000,
    });

    expect(payment.id).toBeDefined();
    expect(payment.orderId).toBe("order-001");
    expect(payment.method).toBe("pix");
    expect(payment.status).toBe("pending");
  });

  it("should find payment by id", async () => {
    const created = await repository.create({
      orderId: "order-001",
      method: "pix",
      amountCents: 10000,
    });

    const found = await repository.findById(created.id);
    expect(found).toEqual(created);
  });

  it("should find payment by order id", async () => {
    const created = await repository.create({
      orderId: "order-001",
      method: "pix",
      amountCents: 10000,
    });

    const found = await repository.findByOrderId("order-001");
    expect(found).toEqual(created);
  });

  it("should find payment by idempotency key", async () => {
    const _created = await repository.create({
      orderId: "order-001",
      method: "pix",
      amountCents: 10000,
    });

    const found = await repository.findByIdempotencyKey("idem-001");
    expect(found).toBeNull();
  });

  it("should update payment status", async () => {
    const created = await repository.create({
      orderId: "order-001",
      method: "pix",
      amountCents: 10000,
    });

    const updated = await repository.updateStatus(created.id, "approved", "ext-001");
    expect(updated.status).toBe("approved");
    expect(updated.externalId).toBe("ext-001");
    expect(updated.paidAt).toBeInstanceOf(Date);
  });
});
