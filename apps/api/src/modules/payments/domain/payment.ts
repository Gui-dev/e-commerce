import { z } from "zod";

export type PaymentMethod = "pix" | "credit_card" | "boleto";
export type PaymentStatus = "pending" | "processing" | "approved" | "rejected" | "refunded";

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: number;
  externalId: string | null;
  idempotencyKey: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(["pix", "credit_card", "boleto"]),
  amountCents: z.number().int().positive(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
