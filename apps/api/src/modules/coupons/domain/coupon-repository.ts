import type { Coupon, CreateCouponInput } from "./coupon.js";

export type { Coupon, CreateCouponInput } from "./coupon.js";

export interface CouponRepository {
  findById(id: string): Promise<Coupon | null>;
  findByCode(code: string): Promise<Coupon | null>;
  list(): Promise<Coupon[]>;
  create(input: CreateCouponInput): Promise<Coupon>;
  incrementUsedCount(id: string): Promise<Coupon>;
  delete(id: string): Promise<void>;
}
