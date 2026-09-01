import type { PaymentRepository } from "../../payments/domain/payment-repository.js";
import type { WebhookRepository } from "../domain/webhook-repository.js";
import type { WebhookPayload } from "../domain/webhook.js";

export class ProcessWebhookUseCase {
  constructor(
    private readonly webhookRepository: WebhookRepository,
    private readonly paymentRepository: PaymentRepository,
  ) {}

  async execute(payload: WebhookPayload) {
    const webhook = await this.webhookRepository.create({
      event: payload.event,
      payload: payload as unknown as Record<string, unknown>,
      processedAt: null,
    });

    const payment = await this.paymentRepository.findById(payload.paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    const statusMap: Record<string, "approved" | "rejected" | "refunded"> = {
      "payment.approved": "approved",
      "payment.rejected": "rejected",
      "payment.refunded": "refunded",
    };

    const newStatus = statusMap[payload.event];
    if (newStatus) {
      await this.paymentRepository.updateStatus(payment.id, newStatus, payload.externalId);
    }

    await this.webhookRepository.markProcessed(webhook.id);

    return { webhookId: webhook.id, paymentId: payment.id, status: newStatus };
  }
}
