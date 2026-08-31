import type {
  Payment,
  PaymentRepository,
  CreatePaymentInput,
} from '../domain/payment-repository.js'

export class InMemoryPaymentRepository implements PaymentRepository {
  private payments: Map<string, Payment> = new Map()
  private nextId = 1

  async findById(id: string): Promise<Payment | null> {
    return this.payments.get(id) ?? null
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    for (const payment of this.payments.values()) {
      if (payment.orderId === orderId) return payment
    }
    return null
  }

  async findByIdempotencyKey(key: string): Promise<Payment | null> {
    for (const payment of this.payments.values()) {
      if (payment.idempotencyKey === key) return payment
    }
    return null
  }

  async create(input: CreatePaymentInput): Promise<Payment> {
    const now = new Date()
    const payment: Payment = {
      id: `pay-${this.nextId++}`,
      orderId: input.orderId,
      method: input.method,
      status: 'pending',
      amountCents: input.amountCents,
      externalId: null,
      idempotencyKey: null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    }

    this.payments.set(payment.id, payment)
    return payment
  }

  async updateStatus(id: string, status: Payment['status'], externalId?: string): Promise<Payment> {
    const payment = this.payments.get(id)
    if (!payment) throw new Error('Payment not found')

    const updated: Payment = {
      ...payment,
      status,
      externalId: externalId ?? payment.externalId,
      paidAt: status === 'approved' ? new Date() : payment.paidAt,
      updatedAt: new Date(),
    }

    this.payments.set(id, updated)
    return updated
  }
}
