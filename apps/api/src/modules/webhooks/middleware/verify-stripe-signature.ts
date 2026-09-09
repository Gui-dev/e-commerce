import type { preHandlerHookHandler } from "fastify";
import type { Stripe } from "stripe";
import { stripeClient } from "../../payments/infra/stripe-client.js";

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
    request.stripeEvent = stripeClient.webhooks.constructEvent(request.rawBody, signature, secret);
  } catch {
    return reply
      .code(400)
      .send({ error: "INVALID_SIGNATURE", message: "Invalid Stripe signature" });
  }
};
