import { z } from "zod";

const imageUrlSchema = z.union([z.string().url(), z.string().startsWith("/storage/")]);

export const createCategoryBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  imageUrl: imageUrlSchema.optional(),
});

export const updateCategoryBodySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  imageUrl: imageUrlSchema.optional(),
});

export const categoryParamsSchema = z.object({
  id: z.string(),
});
