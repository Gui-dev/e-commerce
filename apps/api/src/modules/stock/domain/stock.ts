import { DomainError } from '../../../lib/errors.js'

export interface Stock {
  id: string
  variantId: string
  quantity: number
  reserved: number
  updatedAt: Date
}

export interface StockMovement {
  id: string
  variantId: string
  type: 'sale' | 'restock' | 'adjustment' | 'return'
  quantity: number
  referenceId: string | null
  notes: string | null
  createdAt: Date
}

export interface StockWithAvailable extends Stock {
  available: number
}

export class StockError extends DomainError {
  constructor(code: string, message: string, statusCode = 400) {
    super(code, message, statusCode)
    this.name = 'StockError'
  }
}

export class InsufficientStockError extends StockError {
  constructor(variantId: string, requested: number, available: number) {
    super(
      'INSUFFICIENT_STOCK',
      `Insufficient stock for variant ${variantId}: requested ${requested}, available ${available}`,
      409,
    )
  }
}

export class StockNotFoundError extends StockError {
  constructor(variantId: string) {
    super('STOCK_NOT_FOUND', `Stock not found for variant ${variantId}`, 404)
  }
}
