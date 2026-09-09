import { z } from "zod";

export const checkoutSchema = z.object({
  address: z.object({
    name: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zip: z.string(),
    country: z.string().length(2).default("BR"),
    taxId: z.string().min(11).max(18).optional(),
  }),
  paymentMethod: z.enum(["pix", "credit_card", "boleto"]),
});

export const paymentIntentSchema = z.object({
  orderId: z.string().uuid(),
  taxId: z.string().min(11).max(18).optional(),
});

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

export const idempotencyKeyHeaderSchema = z.object({
  "idempotency-key": z.string().optional(),
});

export const updateOrderStatusBodySchema = z.object({
  status: z.enum(["pending", "confirmed", "paid", "shipped", "delivered", "cancelled"]),
});

export const paymentIntentResponseSchema = z.union([
  z.object({
    type: z.literal("card"),
    paymentIntentId: z.string(),
    clientSecret: z.string(),
  }),
  z.object({
    type: z.literal("pix"),
    paymentIntentId: z.string(),
    qrCodeUrl: z.string(),
    qrCodePngUrl: z.string(),
    qrCodeSvgUrl: z.string(),
    hostedInstructionsUrl: z.string(),
    expiresAt: z.string().nullable(),
  }),
  z.object({
    type: z.literal("boleto"),
    paymentIntentId: z.string(),
    hostedVoucherUrl: z.string(),
    pdfUrl: z.string(),
    expiresAt: z.string().nullable(),
  }),
]);

export const notFoundResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});
