import type { CouponRepository } from "../../coupons/domain/coupon-repository.js";
import { CouponError } from "../../coupons/domain/coupon.js";
import type { ValidateCouponUseCase } from "../../coupons/use-cases/validate-coupon.use-case.js";
import type { ProductRepository } from "../../products/domain/product-repository.js";
import type { CartRepository } from "../domain/cart-repository.js";

export class ApplyCouponToCartUseCase {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly couponRepository: CouponRepository,
    private readonly productRepository: ProductRepository,
    private readonly validateCoupon: ValidateCouponUseCase,
  ) {}

  async execute(userId: string, code: string): Promise<void> {
    let cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      cart = await this.cartRepository.create(userId);
    }

    let subtotal = 0;
    for (const item of cart.items) {
      const variant = await this.productRepository.findVariantById(item.variantId);
      const product = variant ? await this.productRepository.findById(variant.productId) : null;
      subtotal += item.quantity * (variant?.priceCents ?? product?.priceCents ?? 0);
    }

    const validation = await this.validateCoupon.execute(code, subtotal);
    if (!validation.valid) {
      throw new CouponError("COUPON_INVALID", validation.error ?? "Invalid coupon");
    }

    const coupon = await this.couponRepository.findByCode(code);
    if (!coupon) {
      throw new CouponError("COUPON_NOT_FOUND", "Coupon not found");
    }
    await this.cartRepository.setCoupon(cart.id, coupon.id);
  }
}
