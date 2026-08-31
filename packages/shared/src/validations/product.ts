import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  categoryId: z.string().uuid('Categoria inválida'),
  priceCents: z.number().int().positive('Preço deve ser positivo'),
  skuPrefix: z.string().min(2).max(10).transform((s) => s.toUpperCase()),
  imageUrl: z.string().url().nullable().optional(),
})

export const createVariantSchema = z.object({
  name: z.string().min(1).max(100),
  sku: z.string().min(2).max(20).transform((s) => s.toUpperCase()),
  priceCents: z.number().int().positive().nullable().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type CreateVariantInput = z.infer<typeof createVariantSchema>
