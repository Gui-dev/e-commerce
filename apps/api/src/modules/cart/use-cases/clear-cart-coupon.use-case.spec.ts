import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryCouponRepository } from "../../coupons/infra/in-memory-coupon-repository.js";
import { InMemoryCartRepository } from "../infra/in-memory-cart-repository.js";
import { ClearCartCouponUseCase } from "./clear-cart-coupon.use-case.js";

describe("ClearCartCouponUseCase", () => {
  let cartRepository: InMemoryCartRepository;
  let useCase: ClearCartCouponUseCase;

  beforeEach(() => {
    cartRepository = new InMemoryCartRepository();
    useCase = new ClearCartCouponUseCase(cartRepository);
  });

  it("should clear the coupon from the user's cart", async () => {
    const couponRepository = new InMemoryCouponRepository();
    const coupon = await couponRepository.create({
      code: "DESC10",
      type: "percentage",
      value: 10,
    });
    const cart = await cartRepository.create("user-001");
    await cartRepository.setCoupon(cart.id, coupon.id);

    await useCase.execute("user-001");

    const after = await cartRepository.findByUserId("user-001");
    expect(after?.couponId).toBeNull();
  });

  it("should do nothing when the user has no cart", async () => {
    await expect(useCase.execute("ghost-user")).resolves.not.toThrow();
  });
});
