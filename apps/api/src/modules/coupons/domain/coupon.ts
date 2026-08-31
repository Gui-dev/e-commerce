import { DomainError } from "../../../lib/errors.js";

export interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderCents: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateCouponInput {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderCents?: number | null;
  maxUses?: number | null;
  expiresAt?: Date | null;
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  discountCents?: number;
}

export class CouponError extends DomainError {
  constructor(code: string, message: string, statusCode = 400) {
    super(code, message, statusCode);
    this.name = "CouponError";
  }
}

export class CouponNotFoundError extends CouponError {
  constructor(code: string) {
    super("COUPON_NOT_FOUND", `Coupon "${code}" not found`, 404);
  }
}

export class CouponExpiredError extends CouponError {
  constructor(code: string) {
    super("COUPON_EXPIRED", `Coupon "${code}" has expired`, 410);
  }
}

export class CouponMaxUsesError extends CouponError {
  constructor(code: string) {
    super("COUPON_MAX_USES", `Coupon "${code}" has reached maximum uses`, 409);
  }
}

export class CouponMinOrderError extends CouponError {
  constructor(code: string, minOrderCents: number) {
    super(
      "COUPON_MIN_ORDER",
      `Coupon "${code}" requires minimum order of ${minOrderCents} cents`,
      400,
    );
  }
}
