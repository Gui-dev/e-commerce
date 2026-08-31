import type { Stock, StockMovement } from './stock.js'

export interface StockRepository {
  findByVariantId(variantId: string): Promise<Stock | null>
  create(variantId: string, initialQuantity?: number): Promise<Stock>
  addQuantity(variantId: string, quantity: number): Promise<Stock>
  reserve(variantId: string, quantity: number): Promise<Stock>
  releaseReservation(variantId: string, quantity: number): Promise<Stock>
  confirmSale(variantId: string, quantity: number): Promise<Stock>
  getMovements(variantId: string): Promise<StockMovement[]>
  addMovement(movement: Omit<StockMovement, 'id' | 'createdAt'>): Promise<StockMovement>
}
