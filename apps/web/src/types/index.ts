export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: "customer" | "admin";
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  priceCents: number;
  imageUrl: string | null;
  skuPrefix: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  priceCents: number | null;
  attributes: Record<string, string> | null;
  isActive: boolean;
  createdAt: string;
}

export interface Stock {
  id: string;
  variantId: string;
  quantity: number;
  reserved: number;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
  addedAt: string;
  variant?: ProductVariant;
  product?: Product;
}

export interface Cart {
  id: string;
  userId: string;
  couponId: string | null;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderCents: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export type OrderStatus = "pending" | "confirmed" | "paid" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  couponId: string | null;
  idempotencyKey: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  quantity: number;
  unitPriceCents: number;
  variant?: ProductVariant;
  product?: Product;
}

export type PaymentMethod = "pix" | "credit_card" | "boleto";

export type PaymentStatus = "pending" | "processing" | "approved" | "rejected" | "refunded";

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: number;
  externalId: string | null;
  idempotencyKey: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
}
