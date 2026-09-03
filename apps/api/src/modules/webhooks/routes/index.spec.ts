import { createHmac } from "node:crypto";
import {
  type ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from "@fastify/type-provider-zod";
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { orders, users } from "../../../lib/db/schema.js";
import { db } from "../../../lib/db/test-db.js";
import { resetDatabase, seedTestData } from "../../../lib/db/test-helpers.js";
import { DrizzleOrderRepository } from "../../orders/infra/drizzle-order-repository.js";
import { DrizzlePaymentRepository } from "../../payments/infra/drizzle-payment-repository.js";
import { createWebhookRoutes } from "./index.js";

const TEST_WEBHOOK_SECRET = "test-webhook-secret-for-hmac-signing";
const TEST_USER_ID = "eeeeeeee-0000-4000-8000-000000000005";
const TEST_ORDER_ID = "eeeeeeee-0000-4000-8000-000000000006";

function signBody(body: object): string {
  const raw = JSON.stringify(body);
  return createHmac("sha256", TEST_WEBHOOK_SECRET).update(raw).digest("hex");
}

describe("Payment webhook routes", () => {
  let orderRepository: DrizzleOrderRepository;
  let paymentRepository: DrizzlePaymentRepository;
  let app: ReturnType<typeof Fastify>;
  let originalWebhookSecret: string | undefined;

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
    originalWebhookSecret = process.env.WEBHOOK_SECRET;
    process.env.WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

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

  afterEach(async () => {
    if (originalWebhookSecret === undefined) {
      process.env.WEBHOOK_SECRET = undefined;
    } else {
      process.env.WEBHOOK_SECRET = originalWebhookSecret;
    }
  });

  it("should reject request with missing signature header", async () => {
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

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      error: "INVALID_SIGNATURE",
      message: "Invalid webhook signature",
    });
  });

  it("should reject request with invalid signature", async () => {
    const payment = await createPayment();

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/payment",
      headers: { "x-webhook-signature": "invalid-signature-value" },
      payload: {
        provider: "test-provider",
        event: "payment.approved",
        paymentId: payment.id,
        externalId: "ext-001",
        status: "approved",
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      error: "INVALID_SIGNATURE",
      message: "Invalid webhook signature",
    });
  });

  it("should process an approved webhook with valid signature", async () => {
    const payment = await createPayment();
    const payload = {
      provider: "test-provider",
      event: "payment.approved",
      paymentId: payment.id,
      externalId: "ext-001",
      status: "approved",
    };

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/payment",
      headers: { "x-webhook-signature": signBody(payload) },
      payload,
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
    const payload = {
      provider: "test-provider",
      event: "payment.rejected",
      paymentId: payment.id,
      externalId: "ext-002",
      status: "rejected",
    };

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/payment",
      headers: { "x-webhook-signature": signBody(payload) },
      payload,
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
    const payload = {
      provider: "test-provider",
      event: "payment.refunded",
      paymentId: payment.id,
      externalId: "ext-003",
      status: "refunded",
    };

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/payment",
      headers: { "x-webhook-signature": signBody(payload) },
      payload,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: true });

    const updatedPayment = await paymentRepository.findById(payment.id);
    expect(updatedPayment?.status).toBe("refunded");

    const updatedOrder = await orderRepository.findById(TEST_ORDER_ID);
    expect(updatedOrder?.status).toBe("cancelled");
  });

  it("should return 404 when the payment is not found", async () => {
    const payload = {
      provider: "test-provider",
      event: "payment.approved",
      paymentId: "00000000-0000-0000-0000-000000000000",
      externalId: "ext-004",
      status: "approved",
    };

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/payment",
      headers: { "x-webhook-signature": signBody(payload) },
      payload,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "NOT_FOUND", message: "Payment not found" });
  });
});
