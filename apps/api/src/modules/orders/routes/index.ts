import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../middleware/auth.js";
import { idempotencyMiddleware } from "../../../middleware/idempotency.js";
import type { CartRepository } from "../../cart/domain/cart-repository.js";
import type { CouponRepository } from "../../coupons/domain/coupon-repository.js";
import type { PaymentGateway } from "../../payments/domain/payment-gateway.js";
import type { PaymentRepository } from "../../payments/domain/payment-repository.js";
import { GeneratePaymentIntentUseCase } from "../../payments/use-cases/generate-payment-intent.use-case.js";
import type { ProductRepository } from "../../products/domain/product-repository.js";
import type { StockRepository } from "../../stock/domain/stock-repository.js";
import type { OrderRepository } from "../domain/order-repository.js";
import {
  checkoutSchema,
  idempotencyKeyHeaderSchema,
  orderParamsSchema,
  paymentIntentSchema,
} from "../schemas/order.schema.js";
import { CheckoutUseCase } from "../use-cases/checkout.use-case.js";

export function createCheckoutRoutes(
  orderRepository: OrderRepository,
  cartRepository: CartRepository,
  stockRepository: StockRepository,
  couponRepository: CouponRepository,
  productRepository: ProductRepository,
  paymentRepository: PaymentRepository,
  paymentGateway: PaymentGateway,
) {
  return async function checkoutRoutes(app: FastifyInstance) {
    const checkout = new CheckoutUseCase(
      orderRepository,
      cartRepository,
      stockRepository,
      couponRepository,
      productRepository,
      paymentRepository,
    );

    const generatePaymentIntent = new GeneratePaymentIntentUseCase(
      paymentRepository,
      paymentGateway,
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

        const result = await checkout.execute({
          userId: request.user.id,
          userEmail: request.user.email,
          address: request.body.address,
          paymentMethod: request.body.paymentMethod,
          idempotencyKey,
        });

        return reply.code(201).send({ ...result.order, payment: result.payment });
      },
    );

    app.withTypeProvider<ZodTypeProvider>().post(
      "/checkout/payment-intent",
      {
        preHandler: [requireAuth],
        schema: {
          tags: ["Checkout"],
          summary: "Criar PaymentIntent no Stripe",
          security: [{ cookieAuth: [] }],
          body: paymentIntentSchema,
        },
      },
      async (request, reply) => {
        const { orderId, taxId } = request.body;
        const order = await orderRepository.findById(orderId);
        if (!order || order.userId !== request.user.id) {
          return reply.code(404).send({ error: "NOT_FOUND", message: "Order not found" });
        }

        const result = await generatePaymentIntent.execute({
          orderId,
          userEmail: request.user.email,
          billingName: order.shippingName ?? request.user.name,
          taxId,
        });

        return reply.send(result);
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
        const items = await orderRepository.findItemsByOrderId(id);
        const payment = await paymentRepository.findByOrderId(id);
        return reply.send({ ...order, items, payment });
      },
    );
  };
}
