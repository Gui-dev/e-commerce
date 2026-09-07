import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentGateway, PaymentIntentResult } from "../domain/payment-gateway.js";
import type { Payment } from "../domain/payment.js";
import { GeneratePaymentIntentUseCase } from "./generate-payment-intent.use-case.js";

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

describe("GeneratePaymentIntentUseCase", () => {
  let gateway: PaymentGateway;
  let useCase: GeneratePaymentIntentUseCase;
  let findByOrderId: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    findByOrderId = vi.fn().mockResolvedValue(PAYMENT);
    const repository = { findByOrderId };
    gateway = {
      createPaymentIntent: vi
        .fn()
        .mockResolvedValue({ type: "pix", paymentIntentId: "pi_1" } as PaymentIntentResult),
    };
    useCase = new GeneratePaymentIntentUseCase(repository as never, gateway);
  });

  it("creates a payment intent for the order's payment", async () => {
    const result = await useCase.execute({
      orderId: "order-1",
      userEmail: "maria@example.com",
      billingName: "Maria Silva",
      taxId: "000.000.000-00",
    });

    expect(findByOrderId).toHaveBeenCalledWith("order-1");
    expect(gateway.createPaymentIntent).toHaveBeenCalledWith({
      method: "pix",
      amountCents: 3998,
      orderId: "order-1",
      paymentId: "pay-1",
      billingDetails: {
        name: "Maria Silva",
        email: "maria@example.com",
        taxId: "000.000.000-00",
      },
    });
    expect(result).toEqual({ type: "pix", paymentIntentId: "pi_1" });
  });

  it("throws OrderNotFoundError when no payment exists for the order", async () => {
    findByOrderId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        orderId: "missing",
        userEmail: "maria@example.com",
        billingName: "Maria",
      }),
    ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND", statusCode: 404 });
    expect(gateway.createPaymentIntent).not.toHaveBeenCalled();
  });
});
