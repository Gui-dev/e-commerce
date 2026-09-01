import { z } from "zod";

export const stockParamsSchema = z.object({
  variantId: z.string(),
});

export const adjustStockBodySchema = z.object({
  quantity: z.number().int(),
  reason: z.string().min(1),
});
