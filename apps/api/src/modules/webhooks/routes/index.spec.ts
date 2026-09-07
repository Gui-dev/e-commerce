import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import Fastify from "fastify";
import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { orders, users } from "../../../lib/db/schema.js";
import { db } from "../../../lib/db/test-db.js";
import { resetDatabase, seedTestData } from "../../../lib/db/test-helpers.js";
import { DrizzleOrderRepository } from "../../orders/infra/drizzle-order-repository.js";
import { DrizzlePaymentRepository } from "../../payments/infra/drizzle-payment-repository.js";
import { createWebhookRoutes } from "./index.js";

const TEST_WEBHOOK_SECRET = "whsec_test-secret-for-stripe-signing";
const TEST_SECRET_KEY = "sk_test_example";
const TEST_USER_ID = "eeeeeeee-0000-4000-8000-000000000005";
const TEST_ORDER_ID = "eeeeeeee-0000-4000-8000-000000000006";

function createStripeEvent(
  type: string,
  status: string,
  paymentId: string,
): { payload: string; signature: string } {
  const event = {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    object: "event",
    type,
    data: {
      object: {
        id: "pi_123",
        object: "payment_intent",
        status,
        metadata: { orderId: TEST_ORDER_ID, paymentId },
      },
    },
  };
  const payload = JSON.stringify(event);
  const stripe = new Stripe(TEST_SECRET_KEY, { apiVersion: "2026-08-26.dahlia" });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: TEST_WEBHOOK_SECRET,
  });
  return { payload, signature };
}

describe("Stripe webhook routes", () => {
  let app: ReturnType<typeof Fastify>;
  let originalWebhookSecret: string | undefined;
  let originalSecretKey: string | undefined;
  let paymentId: string;

  beforeEach(async () => {
    originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    originalSecretKey = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = TEST_SECRET_KEY;

    await resetDatabase();
    await seedTestData();
    await db.insert(users).values({
      id: TEST_USER_ID,
      name: "Test User",
      email: "webhook-stripe@example.com",
      emailVerified: true,
      role: "customer",
    });
    await db.insert(orders).values({
      id: TEST_ORDER_ID,
      userId: TEST_USER_ID,
      status: "pending",
      subtotalCents: 3998,
      discountCents: 0,
      totalCents: 3998,
    });

    const orderRepository = new DrizzleOrderRepository(db);
    const paymentRepository = new DrizzlePaymentRepository(db);
    const payment = await paymentRepository.create({
      orderId: TEST_ORDER_ID,
      method: "pix",
      amountCents: 3998,
    });
    paymentId = payment.id;

    app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(createWebhookRoutes(paymentRepository, orderRepository));
    await app.ready();
  });

  afterEach(async () => {
    process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
    process.env.STRIPE_SECRET_KEY = originalSecretKey;
  });

  it("should reject request without stripe-signature header", async () => {
    const { payload } = createStripeEvent("payment_intent.succeeded", "succeeded", paymentId);
    const res = await app.inject({ method: "POST", url: "/webhooks/stripe", payload });

    expect(res.statusCode).toBe(400);
  });

  it("should reject request with invalid signature", async () => {
    const { payload } = createStripeEvent("payment_intent.succeeded", "succeeded", paymentId);
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/stripe",
      headers: { "stripe-signature": "t=1,v1=invalid" },
      payload,
    });

    expect(res.statusCode).toBe(400);
  });

  it("should approve payment and mark order paid on succeeded", async () => {
    const { payload, signature } = createStripeEvent(
      "payment_intent.succeeded",
      "succeeded",
      paymentId,
    );
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/stripe",
      headers: { "stripe-signature": signature },
      payload,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: true });

    const orderRepository = new DrizzleOrderRepository(db);
    const paymentRepository = new DrizzlePaymentRepository(db);
    const payment = await paymentRepository.findById(paymentId);
    const order = await orderRepository.findById(TEST_ORDER_ID);
    expect(payment?.status).toBe("approved");
    expect(payment?.externalId).toBe("pi_123");
    expect(order?.status).toBe("paid");
  });

  it("should reject payment and cancel order on payment_failed", async () => {
    const { payload, signature } = createStripeEvent(
      "payment_intent.payment_failed",
      "requires_payment_method",
      paymentId,
    );
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/stripe",
      headers: { "stripe-signature": signature },
      payload,
    });

    expect(res.statusCode).toBe(200);

    const paymentRepository = new DrizzlePaymentRepository(db);
    const orderRepository = new DrizzleOrderRepository(db);
    const payment = await paymentRepository.findById(paymentId);
    const order = await orderRepository.findById(TEST_ORDER_ID);
    expect(payment?.status).toBe("rejected");
    expect(order?.status).toBe("cancelled");
  });
});
