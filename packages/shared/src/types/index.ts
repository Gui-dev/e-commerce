export type UserRole = "customer" | "admin";
export type OrderStatus = "pending" | "confirmed" | "paid" | "shipped" | "delivered" | "cancelled";
export type PaymentMethod = "pix" | "credit_card" | "boleto";
export type PaymentStatus = "pending" | "processing" | "approved" | "rejected" | "refunded";
export type CouponType = "percentage" | "fixed";

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  priceCents: number | null;
  attributes: Record<string, string> | null;
  isActive: boolean;
  createdAt: Date;
}

export interface Stock {
  id: string;
  variantId: string;
  quantity: number;
  reserved: number;
  updatedAt: Date;
}
