import { z } from "zod";

export const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(["pix", "credit_card", "boleto"]),
  amountCents: z.number().int().positive(),
});

export const paymentParamsSchema = z.object({
  id: z.string(),
});

export const webhookPayloadSchema = z.object({
  event: z.enum(["payment.approved", "payment.rejected", "payment.refunded"]),
  paymentId: z.string().uuid(),
  externalId: z.string(),
  timestamp: z.string().datetime(),
});
