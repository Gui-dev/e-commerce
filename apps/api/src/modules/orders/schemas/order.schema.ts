import { z } from "zod";

export const checkoutSchema = z.object({});

export const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(["pix", "credit_card", "boleto"]),
  amountCents: z.number().int().positive(),
});

export const paymentParamsSchema = z.object({
  id: z.string(),
});

export const orderParamsSchema = z.object({
  id: z.string(),
});

export const webhookPaymentSchema = z.object({
  provider: z.string(),
  event: z.string(),
  paymentId: z.string(),
  externalId: z.string(),
  status: z.enum(["approved", "rejected", "refunded"]),
});

export const idempotencyKeyHeaderSchema = z.object({
  "idempotency-key": z.string().optional(),
});

export const updateOrderStatusBodySchema = z.object({
  status: z.enum(["pending", "confirmed", "paid", "shipped", "delivered", "cancelled"]),
});
