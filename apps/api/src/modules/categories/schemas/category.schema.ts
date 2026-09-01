import { z } from "zod";

export const createCategoryBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export const updateCategoryBodySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export const categoryParamsSchema = z.object({
  id: z.string(),
});
