import type { preHandlerHookHandler } from "fastify";
import Stripe from "stripe";

declare module "fastify" {
  interface FastifyRequest {
    stripeEvent?: Stripe.Event;
  }
}

export const verifyStripeSignature: preHandlerHookHandler = async (request, reply) => {
  const signature = request.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (typeof signature !== "string" || signature.length === 0 || !secret || !request.rawBody) {
    return reply
      .code(400)
      .send({ error: "INVALID_SIGNATURE", message: "Invalid Stripe signature" });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
      apiVersion: "2026-08-26.dahlia",
    });
    request.stripeEvent = stripe.webhooks.constructEvent(request.rawBody, signature, secret);
  } catch {
    return reply
      .code(400)
      .send({ error: "INVALID_SIGNATURE", message: "Invalid Stripe signature" });
  }
};
