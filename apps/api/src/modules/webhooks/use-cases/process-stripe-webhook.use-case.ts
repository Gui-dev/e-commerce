import type Stripe from "stripe";
import type { Order } from "../../orders/domain/order.js";
import type { PaymentRepository } from "../../payments/domain/payment-repository.js";
import type { Payment, PaymentStatus } from "../../payments/domain/payment.js";

export class ProcessStripeWebhookUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentStatusUpdater: {
      updateStatus(id: string, status: PaymentStatus, externalId?: string): Promise<Payment>;
    },
    private readonly orderStatusUpdater: {
      updateStatus(id: string, status: Order["status"]): Promise<Order>;
    },
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
      await this.paymentStatusUpdater.updateStatus(payment.id, "approved", paymentIntent.id);
      await this.orderStatusUpdater.updateStatus(payment.orderId, "paid");
      return { paymentId, orderId };
    }

    if (payment.status === "rejected") return { paymentId, orderId };
    await this.paymentStatusUpdater.updateStatus(payment.id, "rejected", paymentIntent.id);
    await this.orderStatusUpdater.updateStatus(payment.orderId, "cancelled");
    return { paymentId, orderId };
  }
}
