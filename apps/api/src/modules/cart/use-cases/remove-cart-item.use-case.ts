import type { CartRepository } from '../domain/cart-repository.js'

export class RemoveCartItemUseCase {
  constructor(private readonly repository: CartRepository) {}

  async execute(itemId: string): Promise<void> {
    return this.repository.removeItem(itemId)
  }
}
