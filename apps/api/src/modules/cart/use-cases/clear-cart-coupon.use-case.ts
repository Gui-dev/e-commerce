import type { CartRepository } from "../domain/cart-repository.js";

export class ClearCartCouponUseCase {
  constructor(private readonly cartRepository: CartRepository) {}

  async execute(userId: string): Promise<void> {
    const cart = await this.cartRepository.findByUserId(userId);
    if (cart) {
      await this.cartRepository.setCoupon(cart.id, null);
    }
  }
}
