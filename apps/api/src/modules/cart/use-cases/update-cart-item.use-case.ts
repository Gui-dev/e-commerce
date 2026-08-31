import type { StockRepository } from "../../stock/domain/stock-repository.js";
import { InsufficientStockError } from "../../stock/domain/stock.js";
import type { CartItem, CartRepository } from "../domain/cart-repository.js";

export class UpdateCartItemUseCase {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly stockRepository: StockRepository,
  ) {}

  async execute(_userId: string, itemId: string, quantity: number): Promise<CartItem> {
    const item = await this.cartRepository.findItemById(itemId);
    if (!item) throw new Error("Cart item not found");

    const stock = await this.stockRepository.findByVariantId(item.variantId);
    if (!stock) {
      throw new InsufficientStockError(item.variantId, quantity, 0);
    }

    const available = stock.quantity - stock.reserved;
    if (available < quantity) {
      throw new InsufficientStockError(item.variantId, quantity, available);
    }

    return this.cartRepository.updateItem(itemId, { quantity });
  }
}
