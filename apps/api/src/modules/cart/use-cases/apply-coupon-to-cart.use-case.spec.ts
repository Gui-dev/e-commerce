import { beforeEach, describe, expect, it } from "vitest";
import { CouponError } from "../../coupons/domain/coupon.js";
import { InMemoryCouponRepository } from "../../coupons/infra/in-memory-coupon-repository.js";
import { ValidateCouponUseCase } from "../../coupons/use-cases/validate-coupon.use-case.js";
import { InMemoryProductRepository } from "../../products/infra/in-memory-product-repository.js";
import { InMemoryCartRepository } from "../infra/in-memory-cart-repository.js";
import { ApplyCouponToCartUseCase } from "./apply-coupon-to-cart.use-case.js";

describe("ApplyCouponToCartUseCase", () => {
  let cartRepository: InMemoryCartRepository;
  let couponRepository: InMemoryCouponRepository;
  let productRepository: InMemoryProductRepository;
  let useCase: ApplyCouponToCartUseCase;

  beforeEach(async () => {
    cartRepository = new InMemoryCartRepository();
    couponRepository = new InMemoryCouponRepository();
    productRepository = new InMemoryProductRepository();

    const product = await productRepository.create({
      name: "Test Product",
      slug: "test-product",
      description: "Test",
      categoryId: "cat-001",
      priceCents: 50000,
      skuPrefix: "TST",
    });
    await productRepository.createVariant(product.id, {
      name: "Default",
      sku: "TST-001",
      priceCents: 50000,
    });
    const variant = (await productRepository.findVariantsByProductId(product.id))[0];
    const cart = await cartRepository.create("user-001");
    await cartRepository.addItem(cart.id, { variantId: variant!.id, quantity: 2 });

    useCase = new ApplyCouponToCartUseCase(
      cartRepository,
      couponRepository,
      productRepository,
      new ValidateCouponUseCase(couponRepository),
    );
  });

  it("should persist a valid coupon on the user's cart", async () => {
    const coupon = await couponRepository.create({
      code: "DESC10",
      type: "percentage",
      value: 10,
    });

    await useCase.execute("user-001", "DESC10");

    const cart = await cartRepository.findByUserId("user-001");
    expect(cart?.couponId).toBe(coupon.id);
  });

  it("should create a cart when the user has none and apply the coupon", async () => {
    await couponRepository.create({ code: "DESC10", type: "percentage", value: 10 });

    await useCase.execute("user-002", "DESC10");

    const cart = await cartRepository.findByUserId("user-002");
    expect(cart).not.toBeNull();
    expect(cart?.couponId).not.toBeNull();
  });

  it("should throw when the coupon is expired", async () => {
    await couponRepository.create({
      code: "EXPIRED",
      type: "percentage",
      value: 10,
      expiresAt: new Date("2020-01-01"),
    });

    await expect(useCase.execute("user-001", "EXPIRED")).rejects.toThrow(CouponError);

    const cart = await cartRepository.findByUserId("user-001");
    expect(cart?.couponId).toBeNull();
  });

  it("should throw when the coupon is below the cart minimum order", async () => {
    await couponRepository.create({
      code: "MINHIGH",
      type: "percentage",
      value: 10,
      minOrderCents: 150000,
    });

    await expect(useCase.execute("user-001", "MINHIGH")).rejects.toThrow(CouponError);
  });
});
