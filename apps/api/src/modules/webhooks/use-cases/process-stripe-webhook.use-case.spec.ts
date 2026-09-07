import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Payment } from "../../payments/domain/payment.js";
import { ProcessStripeWebhookUseCase } from "./process-stripe-webhook.use-case.js";

const PAYMENT: Payment = {
  id: "pay-1",
  orderId: "order-1",
  method: "pix",
  status: "pending",
  amountCents: 3998,
  externalId: null,
  idempotencyKey: null,
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function eventPayload(type: string, status: string) {
  return {
    type,
    data: {
      object: {
        id: "pi_1",
        metadata: { orderId: "order-1", paymentId: "pay-1" },
        status,
      },
    },
  };
}

describe("ProcessStripeWebhookUseCase", () => {
  let findByPaymentId: ReturnType<typeof vi.fn>;
  let updatePaymentStatus: ReturnType<typeof vi.fn>;
  let updateOrderStatus: ReturnType<typeof vi.fn>;
  let useCase: ProcessStripeWebhookUseCase;

  beforeEach(() => {
    findByPaymentId = vi.fn().mockResolvedValue(PAYMENT);
    updatePaymentStatus = vi.fn();
    updateOrderStatus = vi.fn();
    useCase = new ProcessStripeWebhookUseCase(
      { findById: findByPaymentId, updateStatus: updatePaymentStatus } as never,
      { updateStatus: updateOrderStatus } as never,
    );
  });

  it("returns null when payment is not found", async () => {
    findByPaymentId.mockResolvedValue(null);
    const result = await useCase.execute({
      type: "payment_intent.succeeded",
      data: { object: { metadata: { orderId: "order-1", paymentId: "missing" } } },
    } as never);
    expect(result).toBeNull();
    expect(updatePaymentStatus).not.toHaveBeenCalled();
  });

  it("approves payment and marks order paid on succeeded", async () => {
    const result = await useCase.execute(
      eventPayload("payment_intent.succeeded", "succeeded") as never,
    );

    expect(updatePaymentStatus).toHaveBeenCalledWith("pay-1", "approved", "pi_1");
    expect(updateOrderStatus).toHaveBeenCalledWith("order-1", "paid");
    expect(result).toEqual({ paymentId: "pay-1", orderId: "order-1" });
  });

  it("rejects payment and cancels order on payment_failed", async () => {
    const result = await useCase.execute(
      eventPayload("payment_intent.payment_failed", "requires_payment_method") as never,
    );

    expect(updatePaymentStatus).toHaveBeenCalledWith("pay-1", "rejected", "pi_1");
    expect(updateOrderStatus).toHaveBeenCalledWith("order-1", "cancelled");
    expect(result).toEqual({ paymentId: "pay-1", orderId: "order-1" });
  });

  it("is idempotent when payment status is already approved", async () => {
    findByPaymentId.mockResolvedValue({ ...PAYMENT, status: "approved" });
    await useCase.execute(eventPayload("payment_intent.succeeded", "succeeded") as never);

    expect(updatePaymentStatus).not.toHaveBeenCalled();
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it("does not cancel a paid order when failed arrives after success", async () => {
    findByPaymentId.mockResolvedValue({ ...PAYMENT, status: "approved" });
    const result = await useCase.execute(
      eventPayload("payment_intent.payment_failed", "requires_payment_method") as never,
    );

    expect(updatePaymentStatus).not.toHaveBeenCalled();
    expect(updateOrderStatus).not.toHaveBeenCalled();
    expect(result).toEqual({ paymentId: "pay-1", orderId: "order-1" });
  });

  it("is a no-op for unhandled event types", async () => {
    const result = await useCase.execute(eventPayload("charge.refunded", "succeeded") as never);

    expect(updatePaymentStatus).not.toHaveBeenCalled();
    expect(updateOrderStatus).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
