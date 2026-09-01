import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryPaymentRepository } from "../infra/in-memory-payment-repository.js";
import { CreatePaymentUseCase } from "./create-payment.use-case.js";

describe("CreatePaymentUseCase", () => {
  let repository: InMemoryPaymentRepository;
  let useCase: CreatePaymentUseCase;

  beforeEach(() => {
    repository = new InMemoryPaymentRepository();
    useCase = new CreatePaymentUseCase(repository);
  });

  it("should create a payment", async () => {
    const payment = await useCase.execute({
      orderId: "order-001",
      method: "pix",
      amountCents: 10000,
    });

    expect(payment.id).toBeDefined();
    expect(payment.orderId).toBe("order-001");
    expect(payment.method).toBe("pix");
    expect(payment.status).toBe("pending");
  });

  it("should create payment with credit card method", async () => {
    const payment = await useCase.execute({
      orderId: "order-002",
      method: "credit_card",
      amountCents: 25000,
    });

    expect(payment.method).toBe("credit_card");
    expect(payment.amountCents).toBe(25000);
  });

  it("should create payment with boleto method", async () => {
    const payment = await useCase.execute({
      orderId: "order-003",
      method: "boleto",
      amountCents: 50000,
    });

    expect(payment.method).toBe("boleto");
    expect(payment.amountCents).toBe(50000);
  });
});
