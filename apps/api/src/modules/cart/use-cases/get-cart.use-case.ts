import type { Cart, CartRepository } from "../domain/cart-repository.js";

export class GetCartUseCase {
  constructor(private readonly repository: CartRepository) {}

  async execute(userId: string): Promise<Cart> {
    let cart = await this.repository.findByUserId(userId);
    if (!cart) {
      cart = await this.repository.create(userId);
    }
    return cart;
  }
}
