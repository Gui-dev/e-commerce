import type { FastifyInstance } from "fastify";
import type { OrderRepository } from "../../orders/domain/order-repository.js";
import type { PaymentRepository } from "../../payments/domain/payment-repository.js";
import { captureRawBody } from "../middleware/capture-raw-body.js";
import { verifyStripeSignature } from "../middleware/verify-stripe-signature.js";
import { ProcessStripeWebhookUseCase } from "../use-cases/process-stripe-webhook.use-case.js";

export function createWebhookRoutes(
  paymentRepository: PaymentRepository,
  orderRepository: OrderRepository,
) {
  return async function webhookRoutes(app: FastifyInstance) {
    app.post(
      "/webhooks/stripe",
      {
        preParsing: captureRawBody,
        preHandler: verifyStripeSignature,
      },
      async (request) => {
        const event = request.stripeEvent!;
        await new ProcessStripeWebhookUseCase(paymentRepository, orderRepository).execute(event);
        return { received: true };
      },
    );
  };
}
