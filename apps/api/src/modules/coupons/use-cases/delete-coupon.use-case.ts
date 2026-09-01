import type { CouponRepository } from "../domain/coupon-repository.js";

export class DeleteCouponUseCase {
  constructor(private readonly couponRepository: CouponRepository) {}

  async execute(id: string) {
    await this.couponRepository.delete(id);
  }
}
