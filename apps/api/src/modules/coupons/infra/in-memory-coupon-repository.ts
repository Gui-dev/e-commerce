import type { Coupon, CouponRepository, CreateCouponInput } from "../domain/coupon-repository.js";
import { CouponNotFoundError } from "../domain/coupon.js";

export class InMemoryCouponRepository implements CouponRepository {
  private coupons: Map<string, Coupon> = new Map();
  private nextId = 1;

  async findById(id: string): Promise<Coupon | null> {
    return this.coupons.get(id) ?? null;
  }

  async findByCode(code: string): Promise<Coupon | null> {
    for (const coupon of this.coupons.values()) {
      if (coupon.code === code) return coupon;
    }
    return null;
  }

  async list(): Promise<Coupon[]> {
    return Array.from(this.coupons.values());
  }

  async create(input: CreateCouponInput): Promise<Coupon> {
    const coupon: Coupon = {
      id: `coupon-${this.nextId++}`,
      code: input.code.toUpperCase(),
      type: input.type,
      value: input.value,
      minOrderCents: input.minOrderCents ?? null,
      maxUses: input.maxUses ?? null,
      usedCount: 0,
      expiresAt: input.expiresAt ?? null,
      isActive: true,
      createdAt: new Date(),
    };

    this.coupons.set(coupon.id, coupon);
    return coupon;
  }

  async incrementUsedCount(id: string): Promise<Coupon> {
    const coupon = this.coupons.get(id);
    if (!coupon) throw new CouponNotFoundError(id);

    const updated: Coupon = {
      ...coupon,
      usedCount: coupon.usedCount + 1,
    };

    this.coupons.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.coupons.has(id)) throw new CouponNotFoundError(id);
    this.coupons.delete(id);
  }
}
