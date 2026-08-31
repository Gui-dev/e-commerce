import type { CouponRepository } from "../domain/coupon-repository.js";
import type { Coupon, CouponValidationResult } from "../domain/coupon.js";

export class ValidateCouponUseCase {
  constructor(private readonly repository: CouponRepository) {}

  async execute(code: string, orderCents: number): Promise<CouponValidationResult> {
    const coupon = await this.repository.findByCode(code);

    if (!coupon) {
      return { valid: false, error: "Coupon not found" };
    }

    if (!coupon.isActive) {
      return { valid: false, error: "Coupon is inactive" };
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { valid: false, error: "Coupon has expired" };
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, error: "Coupon has reached maximum uses" };
    }

    if (coupon.minOrderCents && orderCents < coupon.minOrderCents) {
      return {
        valid: false,
        error: `Minimum order is ${(coupon.minOrderCents / 100).toFixed(2)}`,
      };
    }

    const discountCents = this.calculateDiscount(coupon, orderCents);

    return { valid: true, discountCents };
  }

  private calculateDiscount(coupon: Coupon, orderCents: number): number {
    if (coupon.type === "percentage") {
      return Math.floor((orderCents * coupon.value) / 100);
    }
    return Math.min(coupon.value, orderCents);
  }
}
