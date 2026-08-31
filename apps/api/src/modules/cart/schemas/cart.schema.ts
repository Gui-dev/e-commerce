import { z } from "zod";

export const addToCartSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
});

export const cartItemParamsSchema = z.object({
  itemId: z.string(),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1),
});
