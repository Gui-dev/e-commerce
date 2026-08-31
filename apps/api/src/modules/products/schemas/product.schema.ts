import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(10),
  categoryId: z.string().uuid(),
  priceCents: z.number().int().positive(),
  skuPrefix: z.string().min(2).max(10),
  imageUrl: z.string().url().nullable().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(10).optional(),
  categoryId: z.string().uuid().optional(),
  priceCents: z.number().int().positive().optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const listProductsQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});

export const productParamsSchema = z.object({
  slug: z.string(),
});

export const productIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createVariantSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  priceCents: z.number().int().positive().nullable().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
});

export const updateVariantSchema = z.object({
  name: z.string().min(1).optional(),
  priceCents: z.number().int().positive().nullable().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const variantParamsSchema = z.object({
  id: z.string(),
  variantId: z.string(),
});
