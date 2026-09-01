import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmptyCartError } from "../../cart/domain/cart.js";
import { InMemoryCartRepository } from "../../cart/infra/in-memory-cart-repository.js";
import { InMemoryCouponRepository } from "../../coupons/infra/in-memory-coupon-repository.js";
import { InMemoryProductRepository } from "../../products/infra/in-memory-product-repository.js";
import { InMemoryStockRepository } from "../../stock/infra/in-memory-stock-repository.js";
import { InMemoryOrderRepository } from "../infra/in-memory-order-repository.js";
import { CheckoutUseCase } from "./checkout.use-case.js";

const mockAdd = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock("../../../queues/email.queue.js", async () => {
  return {
    emailQueue: { add: mockAdd },
  };
});

describe("CheckoutUseCase", () => {
  let orderRepository: InMemoryOrderRepository;
  let cartRepository: InMemoryCartRepository;
  let stockRepository: InMemoryStockRepository;
  let couponRepository: InMemoryCouponRepository;
  let productRepository: InMemoryProductRepository;
  let useCase: CheckoutUseCase;

  beforeEach(async () => {
    orderRepository = new InMemoryOrderRepository();
    cartRepository = new InMemoryCartRepository();
    stockRepository = new InMemoryStockRepository();
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

    useCase = new CheckoutUseCase(
      orderRepository,
      cartRepository,
      stockRepository,
      couponRepository,
      productRepository,
    );
  });

  it("should create an order from cart", async () => {
    await stockRepository.create("var-001", 10);
    const cart = await cartRepository.create("user-001");
    await cartRepository.addItem(cart.id, { variantId: "var-001", quantity: 2 });

    const order = await useCase.execute({ userId: "user-001", userEmail: "user@example.com" });

    expect(order.id).toBeDefined();
    expect(order.status).toBe("pending");
    expect(order.userId).toBe("user-001");
  });

  it("should throw EmptyCartError for empty cart", async () => {
    await expect(
      useCase.execute({ userId: "user-001", userEmail: "user@example.com" }),
    ).rejects.toThrow(EmptyCartError);
  });

  it("should apply idempotency key", async () => {
    await stockRepository.create("var-001", 10);
    const cart = await cartRepository.create("user-001");
    await cartRepository.addItem(cart.id, { variantId: "var-001", quantity: 1 });

    const order1 = await useCase.execute({
      userId: "user-001",
      userEmail: "user@example.com",
      idempotencyKey: "idem-001",
    });
    const order2 = await useCase.execute({
      userId: "user-001",
      userEmail: "user@example.com",
      idempotencyKey: "idem-001",
    });

    expect(order1.id).toBe(order2.id);
  });

  it("should confirm stock sale", async () => {
    await stockRepository.create("var-001", 10);
    const cart = await cartRepository.create("user-001");
    await cartRepository.addItem(cart.id, { variantId: "var-001", quantity: 3 });

    await useCase.execute({ userId: "user-001", userEmail: "user@example.com" });

    const stock = await stockRepository.findByVariantId("var-001");
    expect(stock?.quantity).toBe(7);
  });
});
