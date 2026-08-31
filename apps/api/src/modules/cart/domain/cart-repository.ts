import type { AddToCartInput, Cart, CartItem, UpdateCartItemInput } from "./cart.js";

export type { Cart, CartItem, AddToCartInput, UpdateCartItemInput } from "./cart.js";

export interface CartRepository {
  findByUserId(userId: string): Promise<Cart | null>;
  findItemById(itemId: string): Promise<CartItem | null>;
  create(userId: string): Promise<Cart>;
  addItem(cartId: string, input: AddToCartInput): Promise<CartItem>;
  updateItem(itemId: string, input: UpdateCartItemInput): Promise<CartItem>;
  removeItem(itemId: string): Promise<void>;
  clearCart(cartId: string): Promise<void>;
  findCartItemByVariantId(cartId: string, variantId: string): Promise<CartItem | null>;
}
