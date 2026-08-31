import type { Payment, CreatePaymentInput } from './payment.js'

export type { Payment, CreatePaymentInput } from './payment.js'

export interface PaymentRepository {
  findById(id: string): Promise<Payment | null>
  findByOrderId(orderId: string): Promise<Payment | null>
  findByIdempotencyKey(key: string): Promise<Payment | null>
  create(input: CreatePaymentInput): Promise<Payment>
  updateStatus(id: string, status: Payment['status'], externalId?: string): Promise<Payment>
}
