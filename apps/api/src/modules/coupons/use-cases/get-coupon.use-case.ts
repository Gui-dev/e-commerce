import type { CouponRepository } from "../domain/coupon-repository.js";
import { CouponNotFoundError } from "../domain/coupon.js";

export class GetCouponUseCase {
  constructor(private readonly couponRepository: CouponRepository) {}

  async execute(id: string) {
    const coupon = await this.couponRepository.findById(id);
    if (!coupon) throw new CouponNotFoundError(id);
    return coupon;
  }
}
