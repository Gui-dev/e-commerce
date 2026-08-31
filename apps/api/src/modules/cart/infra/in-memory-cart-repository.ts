import type {
  AddToCartInput,
  Cart,
  CartItem,
  CartRepository,
  UpdateCartItemInput,
} from "../domain/cart-repository.js";
import { CartItemNotFoundError, CartNotFoundError } from "../domain/cart.js";

export class InMemoryCartRepository implements CartRepository {
  private carts: Map<string, Cart> = new Map();
  private items: Map<string, CartItem> = new Map();
  private nextId = 1;

  async findByUserId(userId: string): Promise<Cart | null> {
    for (const cart of this.carts.values()) {
      if (cart.userId === userId) {
        const cartItems = Array.from(this.items.values()).filter((i) => i.cartId === cart.id);
        return { ...cart, items: cartItems };
      }
    }
    return null;
  }

  async findItemById(itemId: string): Promise<CartItem | null> {
    return this.items.get(itemId) ?? null;
  }

  async create(userId: string): Promise<Cart> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;

    const now = new Date();
    const cart: Cart = {
      id: `cart-${this.nextId++}`,
      userId,
      couponId: null,
      items: [],
      createdAt: now,
      updatedAt: now,
    };

    this.carts.set(cart.id, cart);
    return cart;
  }

  async addItem(cartId: string, input: AddToCartInput): Promise<CartItem> {
    if (!this.carts.has(cartId)) throw new CartNotFoundError(cartId);

    const existingItem = await this.findCartItemByVariantId(cartId, input.variantId);
    if (existingItem) {
      const updated: CartItem = {
        ...existingItem,
        quantity: existingItem.quantity + input.quantity,
      };
      this.items.set(existingItem.id, updated);
      return updated;
    }

    const item: CartItem = {
      id: `item-${this.nextId++}`,
      cartId,
      variantId: input.variantId,
      quantity: input.quantity,
      addedAt: new Date(),
    };

    this.items.set(item.id, item);
    return item;
  }

  async updateItem(itemId: string, input: UpdateCartItemInput): Promise<CartItem> {
    const item = this.items.get(itemId);
    if (!item) throw new CartItemNotFoundError(itemId);

    const updated: CartItem = {
      ...item,
      quantity: input.quantity,
    };

    this.items.set(itemId, updated);
    return updated;
  }

  async removeItem(itemId: string): Promise<void> {
    if (!this.items.has(itemId)) throw new CartItemNotFoundError(itemId);
    this.items.delete(itemId);
  }

  async clearCart(cartId: string): Promise<void> {
    for (const [id, item] of this.items.entries()) {
      if (item.cartId === cartId) {
        this.items.delete(id);
      }
    }
  }

  async findCartItemByVariantId(cartId: string, variantId: string): Promise<CartItem | null> {
    for (const item of this.items.values()) {
      if (item.cartId === cartId && item.variantId === variantId) {
        return item;
      }
    }
    return null;
  }
}
