import { z } from 'zod'

export type WebhookEvent = 'payment.approved' | 'payment.rejected' | 'payment.refunded'

export interface Webhook {
  id: string
  event: WebhookEvent
  payload: Record<string, unknown>
  processedAt: Date | null
  createdAt: Date
}

export const webhookPayloadSchema = z.object({
  event: z.enum(['payment.approved', 'payment.rejected', 'payment.refunded']),
  paymentId: z.string().uuid(),
  externalId: z.string(),
  timestamp: z.string().datetime(),
})

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>
