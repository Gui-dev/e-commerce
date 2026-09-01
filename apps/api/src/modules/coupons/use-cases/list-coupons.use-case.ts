import type { CouponRepository } from "../domain/coupon-repository.js";

export class ListCouponsUseCase {
  constructor(private readonly couponRepository: CouponRepository) {}

  async execute() {
    return this.couponRepository.list();
  }
}
