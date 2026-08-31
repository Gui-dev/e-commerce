import type { Stock, StockRepository } from "../domain/stock-repository.js";

export class ReleaseStockUseCase {
  constructor(private readonly repository: StockRepository) {}

  async execute(variantId: string, quantity: number): Promise<Stock> {
    return this.repository.releaseReservation(variantId, quantity);
  }
}
