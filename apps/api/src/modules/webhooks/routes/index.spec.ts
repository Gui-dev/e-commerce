import {
  type ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from "@fastify/type-provider-zod";
import Fastify from "fastify";
import { beforeEach, describe, expect, it } from "vitest";
import { orders, users } from "../../../lib/db/schema.js";
import { db } from "../../../lib/db/test-db.js";
import { resetDatabase, seedTestData } from "../../../lib/db/test-helpers.js";
import { DrizzleOrderRepository } from "../../orders/infra/drizzle-order-repository.js";
import { DrizzlePaymentRepository } from "../../payments/infra/drizzle-payment-repository.js";
import { createWebhookRoutes } from "./index.js";

const TEST_USER_ID = "eeeeeeee-0000-4000-8000-000000000005";
const TEST_ORDER_ID = "eeeeeeee-0000-4000-8000-000000000006";

describe("Payment webhook routes", () => {
  let orderRepository: DrizzleOrderRepository;
  let paymentRepository: DrizzlePaymentRepository;
  let app: ReturnType<typeof Fastify>;

  async function createOrder() {
    await db.insert(orders).values({
      id: TEST_ORDER_ID,
      userId: TEST_USER_ID,
      status: "pending",
      subtotalCents: 3998,
      discountCents: 0,
      totalCents: 3998,
    });
  }

  async function createPayment() {
    return paymentRepository.create({
      orderId: TEST_ORDER_ID,
      method: "pix",
      amountCents: 3998,
    });
  }

  beforeEach(async () => {
    await resetDatabase();
    await seedTestData();
    await db.insert(users).values({
      id: TEST_USER_ID,
      name: "Test User",
      email: "webhook-test@example.com",
      emailVerified: true,
      role: "customer",
    });
    await createOrder();

    orderRepository = new DrizzleOrderRepository(db);
    paymentRepository = new DrizzlePaymentRepository(db);

    app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(createWebhookRoutes(paymentRepository, orderRepository));
    await app.ready();
  });

  it("should process an approved webhook and mark the order as paid", async () => {
    const payment = await createPayment();

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/payment",
      payload: {
        provider: "test-provider",
        event: "payment.approved",
        paymentId: payment.id,
        externalId: "ext-001",
        status: "approved",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: true });

    const updatedPayment = await paymentRepository.findById(payment.id);
    expect(updatedPayment?.status).toBe("approved");

    const updatedOrder = await orderRepository.findById(TEST_ORDER_ID);
    expect(updatedOrder?.status).toBe("paid");
  });

  it("should process a rejected webhook and mark the order as cancelled", async () => {
    const payment = await createPayment();

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/payment",
      payload: {
        provider: "test-provider",
        event: "payment.rejected",
        paymentId: payment.id,
        externalId: "ext-002",
        status: "rejected",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: true });

    const updatedPayment = await paymentRepository.findById(payment.id);
    expect(updatedPayment?.status).toBe("rejected");

    const updatedOrder = await orderRepository.findById(TEST_ORDER_ID);
    expect(updatedOrder?.status).toBe("cancelled");
  });

  it("should process a refunded webhook and mark the order as cancelled", async () => {
    const payment = await createPayment();

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/payment",
      payload: {
        provider: "test-provider",
        event: "payment.refunded",
        paymentId: payment.id,
        externalId: "ext-003",
        status: "refunded",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: true });

    const updatedPayment = await paymentRepository.findById(payment.id);
    expect(updatedPayment?.status).toBe("refunded");

    const updatedOrder = await orderRepository.findById(TEST_ORDER_ID);
    expect(updatedOrder?.status).toBe("cancelled");
  });

  it("should return 404 when the payment is not found", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/payment",
      payload: {
        provider: "test-provider",
        event: "payment.approved",
        paymentId: "00000000-0000-0000-0000-000000000000",
        externalId: "ext-004",
        status: "approved",
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "NOT_FOUND", message: "Payment not found" });
  });
});
