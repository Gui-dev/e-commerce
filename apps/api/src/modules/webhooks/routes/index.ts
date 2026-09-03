import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import type { OrderRepository } from "../../orders/domain/order-repository.js";
import { webhookPaymentSchema } from "../../orders/schemas/order.schema.js";
import type { PaymentRepository } from "../../payments/domain/payment-repository.js";

export function createWebhookRoutes(
  paymentRepository: PaymentRepository,
  orderRepository: OrderRepository,
) {
  return async function webhookRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post(
      "/webhooks/payment",
      {
        schema: {
          tags: ["Webhooks"],
          summary: "Processar webhook de pagamento",
          body: webhookPaymentSchema,
        },
      },
      async (request, reply) => {
        const { paymentId, status, externalId } = request.body;

        const payment = await paymentRepository.findById(paymentId);
        if (!payment) {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Payment not found" });
        }

        await paymentRepository.updateStatus(payment.id, status, externalId);

        const orderStatusMap: Record<string, "paid" | "cancelled"> = {
          approved: "paid",
          rejected: "cancelled",
          refunded: "cancelled",
        };

        const orderStatus = orderStatusMap[status];
        if (orderStatus) {
          await orderRepository.updateStatus(payment.orderId, orderStatus);
        }

        return reply.code(200).send({ received: true });
      },
    );
  };
}
