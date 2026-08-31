import type { Stock, StockRepository } from "../domain/stock-repository.js";
import { InsufficientStockError, StockNotFoundError } from "../domain/stock.js";

export class ReserveStockUseCase {
  constructor(private readonly repository: StockRepository) {}

  async execute(variantId: string, quantity: number): Promise<Stock> {
    const stock = await this.repository.findByVariantId(variantId);
    if (!stock) {
      throw new StockNotFoundError(variantId);
    }

    const available = stock.quantity - stock.reserved;
    if (available < quantity) {
      throw new InsufficientStockError(variantId, quantity, available);
    }

    return this.repository.reserve(variantId, quantity);
  }
}
