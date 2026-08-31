import { z } from "zod";

export const createCouponSchema = z.object({
  code: z.string().min(1).max(50),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().int().positive(),
  maxUses: z.number().int().positive().nullable().optional(),
  minOrderCents: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1),
  orderCents: z.number().int().positive(),
});

export const couponParamsSchema = z.object({
  id: z.string(),
});
