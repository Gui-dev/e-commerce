import type { Coupon, CouponRepository } from "../domain/coupon-repository.js";
import type { CreateCouponInput } from "../domain/coupon.js";

export class CreateCouponUseCase {
  constructor(private readonly repository: CouponRepository) {}

  async execute(input: CreateCouponInput): Promise<Coupon> {
    return this.repository.create(input);
  }
}
