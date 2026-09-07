import type Stripe from "stripe";
import type { OrderRepository } from "../../orders/domain/order-repository.js";
import type { PaymentRepository } from "../../payments/domain/payment-repository.js";

export class ProcessStripeWebhookUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(event: Stripe.Event) {
    if (
      event.type !== "payment_intent.succeeded" &&
      event.type !== "payment_intent.payment_failed"
    ) {
      return null;
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { orderId, paymentId } = paymentIntent.metadata ?? {};
    if (!orderId || !paymentId) return null;

    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) return null;

    if (event.type === "payment_intent.succeeded") {
      if (payment.status === "approved") return { paymentId, orderId };
      await this.paymentRepository.updateStatus(payment.id, "approved", paymentIntent.id);
      await this.orderRepository.updateStatus(payment.orderId, "paid");
      return { paymentId, orderId };
    }

    if (payment.status === "rejected") return { paymentId, orderId };
    await this.paymentRepository.updateStatus(payment.id, "rejected", paymentIntent.id);
    await this.orderRepository.updateStatus(payment.orderId, "cancelled");
    return { paymentId, orderId };
  }
}
