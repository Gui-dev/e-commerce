import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../middleware/auth.js";
import type { PaymentRepository } from "../domain/payment-repository.js";
import { createPaymentSchema, paymentParamsSchema } from "../schemas/payment.schema.js";
import { CreatePaymentUseCase } from "../use-cases/create-payment.use-case.js";
import { GetPaymentStatusUseCase } from "../use-cases/get-payment-status.use-case.js";

export function createPaymentRoutes(paymentRepository: PaymentRepository) {
  return async function paymentRoutes(app: FastifyInstance) {
    const createPayment = new CreatePaymentUseCase(paymentRepository);
    const getPaymentStatus = new GetPaymentStatusUseCase(paymentRepository);

    app.withTypeProvider<ZodTypeProvider>().post(
      "/payments",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Payments"],
          summary: "Criar pagamento",
          security: [{ cookieAuth: [] }],
          body: createPaymentSchema,
        },
      },
      async (request, reply) => {
        const payment = await createPayment.execute(request.body);
        return reply.code(201).send(payment);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().get(
      "/payments/:id",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Payments"],
          summary: "Obter status do pagamento",
          security: [{ cookieAuth: [] }],
          params: paymentParamsSchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params;
        const payment = await getPaymentStatus.execute(id);
        return reply.send(payment);
      },
    );
  };
}
