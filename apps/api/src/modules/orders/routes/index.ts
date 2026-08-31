import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../middleware/auth.js";
import { idempotencyMiddleware } from "../../../middleware/idempotency.js";
import type { CartRepository } from "../../cart/domain/cart-repository.js";
import type { CouponRepository } from "../../coupons/domain/coupon-repository.js";
import type { StockRepository } from "../../stock/domain/stock-repository.js";
import type { OrderRepository } from "../domain/order-repository.js";
import {
  checkoutSchema,
  createPaymentSchema,
  idempotencyKeyHeaderSchema,
  orderParamsSchema,
  paymentParamsSchema,
  webhookPaymentSchema,
} from "../schemas/order.schema.js";
import { CheckoutUseCase } from "../use-cases/checkout.use-case.js";

export function createCheckoutRoutes(
  orderRepository: OrderRepository,
  cartRepository: CartRepository,
  stockRepository: StockRepository,
  couponRepository: CouponRepository,
) {
  return async function checkoutRoutes(app: FastifyInstance) {
    const checkout = new CheckoutUseCase(
      orderRepository,
      cartRepository,
      stockRepository,
      couponRepository,
    );

    app.withTypeProvider<ZodTypeProvider>().post(
      "/checkout",
      {
        preHandler: [requireAuth, idempotencyMiddleware],
        schema: {
          tags: ["Checkout"],
          summary: "Finalizar compra",
          security: [{ cookieAuth: [] }],
          headers: idempotencyKeyHeaderSchema,
          body: checkoutSchema,
        },
      },
      async (request, reply) => {
        const idempotencyKey = request.headers["idempotency-key"];

        const order = await checkout.execute({
          userId: request.user.id,
          idempotencyKey,
        });

        return reply.code(201).send(order);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().get(
      "/orders",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Orders"],
          summary: "Listar pedidos do usuário",
          security: [{ cookieAuth: [] }],
        },
      },
      async (request, reply) => {
        const orders = await orderRepository.findByUserId(request.user.id);
        return reply.send(orders);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().get(
      "/orders/:id",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Orders"],
          summary: "Obter detalhes do pedido",
          security: [{ cookieAuth: [] }],
          params: orderParamsSchema,
        },
      },
      async (request, reply) => {
        const { id } = request.params;
        const order = await orderRepository.findById(id);
        if (!order || order.userId !== request.user.id) {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Order not found" });
        }
        return reply.send(order);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().post(
      "/payments",
      {
        preHandler: [requireAuth, idempotencyMiddleware],
        schema: {
          tags: ["Payments"],
          summary: "Criar pagamento",
          security: [{ cookieAuth: [] }],
          headers: idempotencyKeyHeaderSchema,
          body: createPaymentSchema,
        },
      },
      async (request, reply) => {
        const idempotencyKey = request.headers["idempotency-key"];

        const payment = await orderRepository.create({
          userId: request.user.id,
          items: [],
          idempotencyKey,
        });

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
        const order = await orderRepository.findById(id);
        if (!order || order.userId !== request.user.id) {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Payment not found" });
        }
        return reply.send(order);
      },
    );

    app.withTypeProvider<ZodTypeProvider>().post(
      "/webhooks/payment",
      {
        schema: {
          tags: ["Webhooks"],
          summary: "Receber webhook de pagamento",
          body: webhookPaymentSchema,
        },
      },
      async (_request, reply) => {
        return reply.send({ received: true });
      },
    );
  };
}
