import { DomainError } from "../../../lib/errors.js";

export interface CartItem {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
  addedAt: Date;
}

export interface CartItemWithDetails extends CartItem {
  variant: {
    id: string;
    name: string;
    sku: string;
    priceCents: number;
    product: {
      id: string;
      name: string;
      slug: string;
      imageUrl: string | null;
    };
  };
}

export interface Cart {
  id: string;
  userId: string;
  couponId: string | null;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CartWithDetails extends Cart {
  items: CartItemWithDetails[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

export interface CreateCartInput {
  userId: string;
}

export interface AddToCartInput {
  variantId: string;
  quantity: number;
}

export interface UpdateCartItemInput {
  quantity: number;
}

export class CartError extends DomainError {
  constructor(code: string, message: string, statusCode = 400) {
    super(code, message, statusCode);
    this.name = "CartError";
  }
}

export class CartNotFoundError extends CartError {
  constructor(userId: string) {
    super("CART_NOT_FOUND", `Cart not found for user ${userId}`, 404);
  }
}

export class CartItemNotFoundError extends CartError {
  constructor(itemId: string) {
    super("CART_ITEM_NOT_FOUND", `Cart item ${itemId} not found`, 404);
  }
}

export class EmptyCartError extends CartError {
  constructor() {
    super("EMPTY_CART", "Cannot checkout with an empty cart", 400);
  }
}
