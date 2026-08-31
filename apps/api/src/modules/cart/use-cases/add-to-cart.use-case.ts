import type { StockRepository } from "../../stock/domain/stock-repository.js";
import { InsufficientStockError } from "../../stock/domain/stock.js";
import type { CartItem, CartRepository } from "../domain/cart-repository.js";
import type { AddToCartInput } from "../domain/cart.js";

export class AddToCartUseCase {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly stockRepository: StockRepository,
  ) {}

  async execute(userId: string, input: AddToCartInput): Promise<CartItem> {
    let cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      cart = await this.cartRepository.create(userId);
    }

    const stock = await this.stockRepository.findByVariantId(input.variantId);
    if (!stock) {
      throw new InsufficientStockError(input.variantId, input.quantity, 0);
    }

    const existingItem = await this.cartRepository.findCartItemByVariantId(
      cart.id,
      input.variantId,
    );

    const currentQuantity = existingItem?.quantity ?? 0;
    const totalRequested = currentQuantity + input.quantity;

    const available = stock.quantity - stock.reserved;
    if (available < totalRequested) {
      throw new InsufficientStockError(input.variantId, totalRequested, available);
    }

    return this.cartRepository.addItem(cart.id, input);
  }
}
