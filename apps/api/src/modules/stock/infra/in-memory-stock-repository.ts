import type {
  Stock,
  StockMovement,
  StockRepository,
} from '../domain/stock-repository.js'
import { StockNotFoundError, InsufficientStockError } from '../domain/stock.js'

export class InMemoryStockRepository implements StockRepository {
  private stock: Map<string, Stock> = new Map()
  private movements: StockMovement[] = []
  private nextId = 1

  async findByVariantId(variantId: string): Promise<Stock | null> {
    for (const s of this.stock.values()) {
      if (s.variantId === variantId) return s
    }
    return null
  }

  async create(variantId: string, initialQuantity = 0): Promise<Stock> {
    const existing = await this.findByVariantId(variantId)
    if (existing) return existing

    const stock: Stock = {
      id: `stk-${this.nextId++}`,
      variantId,
      quantity: initialQuantity,
      reserved: 0,
      updatedAt: new Date(),
    }

    this.stock.set(stock.id, stock)
    return stock
  }

  async addQuantity(variantId: string, quantity: number): Promise<Stock> {
    const stock = await this.findByVariantId(variantId)
    if (!stock) throw new StockNotFoundError(variantId)

    const updated: Stock = {
      ...stock,
      quantity: stock.quantity + quantity,
      updatedAt: new Date(),
    }

    this.stock.set(stock.id, updated)
    return updated
  }

  async reserve(variantId: string, quantity: number): Promise<Stock> {
    const stock = await this.findByVariantId(variantId)
    if (!stock) throw new StockNotFoundError(variantId)

    const available = stock.quantity - stock.reserved
    if (available < quantity) {
      throw new InsufficientStockError(variantId, quantity, available)
    }

    const updated: Stock = {
      ...stock,
      reserved: stock.reserved + quantity,
      updatedAt: new Date(),
    }

    this.stock.set(stock.id, updated)
    return updated
  }

  async releaseReservation(variantId: string, quantity: number): Promise<Stock> {
    const stock = await this.findByVariantId(variantId)
    if (!stock) throw new StockNotFoundError(variantId)

    const updated: Stock = {
      ...stock,
      reserved: Math.max(0, stock.reserved - quantity),
      updatedAt: new Date(),
    }

    this.stock.set(stock.id, updated)
    return updated
  }

  async confirmSale(variantId: string, quantity: number): Promise<Stock> {
    const stock = await this.findByVariantId(variantId)
    if (!stock) throw new StockNotFoundError(variantId)

    const updated: Stock = {
      ...stock,
      quantity: stock.quantity - quantity,
      reserved: Math.max(0, stock.reserved - quantity),
      updatedAt: new Date(),
    }

    this.stock.set(stock.id, updated)
    return updated
  }

  async getMovements(variantId: string): Promise<StockMovement[]> {
    return this.movements.filter((m) => m.variantId === variantId)
  }

  async addMovement(movement: Omit<StockMovement, 'id' | 'createdAt'>): Promise<StockMovement> {
    const newMovement: StockMovement = {
      ...movement,
      id: `mov-${this.nextId++}`,
      createdAt: new Date(),
    }

    this.movements.push(newMovement)
    return newMovement
  }
}
