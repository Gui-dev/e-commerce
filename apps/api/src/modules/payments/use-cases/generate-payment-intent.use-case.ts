import { OrderNotFoundError } from "../../orders/domain/order.js";
import type { PaymentGateway } from "../domain/payment-gateway.js";
import type { PaymentRepository } from "../domain/payment-repository.js";

export interface GeneratePaymentIntentInput {
  orderId: string;
  userEmail: string;
  billingName: string;
  taxId?: string;
}

export class GeneratePaymentIntentUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async execute(input: GeneratePaymentIntentInput) {
    const payment = await this.paymentRepository.findByOrderId(input.orderId);
    if (!payment) {
      throw new OrderNotFoundError(input.orderId);
    }

    return this.paymentGateway.createPaymentIntent({
      method: payment.method,
      amountCents: payment.amountCents,
      orderId: payment.orderId,
      paymentId: payment.id,
      billingDetails: {
        name: input.billingName,
        email: input.userEmail,
        taxId: input.taxId,
      },
    });
  }
}
