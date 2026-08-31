import { DomainError } from '../../../lib/errors.js'

export interface Order {
  id: string
  userId: string
  status: 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  subtotalCents: number
  discountCents: number
  totalCents: number
  couponId: string | null
  idempotencyKey: string | null
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  id: string
  orderId: string
  variantId: string
  quantity: number
  unitPriceCents: number
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
}

export interface CreateOrderInput {
  userId: string
  items: Array<{
    variantId: string
    quantity: number
    unitPriceCents: number
  }>
  couponId?: string | null
  discountCents?: number
  idempotencyKey?: string
}

export interface Payment {
  id: string
  orderId: string
  method: 'pix' | 'credit_card' | 'boleto'
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'refunded'
  amountCents: number
  externalId: string | null
  idempotencyKey: string | null
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreatePaymentInput {
  orderId: string
  method: 'pix' | 'credit_card' | 'boleto'
  amountCents: number
  idempotencyKey?: string
}

export class OrderError extends DomainError {
  constructor(code: string, message: string, statusCode = 400) {
    super(code, message, statusCode)
    this.name = 'OrderError'
  }
}

export class OrderNotFoundError extends OrderError {
  constructor(identifier: string) {
    super('ORDER_NOT_FOUND', `Order "${identifier}" not found`, 404)
  }
}
