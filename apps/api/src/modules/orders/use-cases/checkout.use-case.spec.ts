import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmptyCartError } from "../../cart/domain/cart.js";
import { InMemoryCartRepository } from "../../cart/infra/in-memory-cart-repository.js";
import { InMemoryCouponRepository } from "../../coupons/infra/in-memory-coupon-repository.js";
import { InMemoryPaymentRepository } from "../../payments/infra/in-memory-payment-repository.js";
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

const passthrough = async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn(undefined);

const address = {
  name: "John Doe",
  street: "Rua das Flores, 123",
  city: "São Paulo",
  state: "SP",
  zip: "01000-000",
  country: "BR",
};

describe("CheckoutUseCase", () => {
  let orderRepository: InMemoryOrderRepository;
  let cartRepository: InMemoryCartRepository;
  let stockRepository: InMemoryStockRepository;
  let couponRepository: InMemoryCouponRepository;
  let productRepository: InMemoryProductRepository;
  let useCase: CheckoutUseCase;
  let cartVariantId: string;

  beforeEach(async () => {
    orderRepository = new InMemoryOrderRepository();
    cartRepository = new InMemoryCartRepository();
    stockRepository = new InMemoryStockRepository();
    couponRepository = new InMemoryCouponRepository();
    productRepository = new InMemoryProductRepository();
    const paymentRepository = new InMemoryPaymentRepository();

    const product = await productRepository.create({
      name: "Test Product",
      slug: "test-product",
      description: "Test",
      categoryId: "cat-001",
      priceCents: 50000,
      skuPrefix: "TST",
    });
    const variant = await productRepository.createVariant(product.id, {
      name: "Default",
      sku: "TST-001",
      priceCents: 50000,
    });
    cartVariantId = variant.id;

    useCase = new CheckoutUseCase(
      orderRepository,
      cartRepository,
      stockRepository,
      couponRepository,
      productRepository,
      paymentRepository,
      passthrough,
    );
  });

  it("should create an order from cart", async () => {
    await stockRepository.create(cartVariantId, 10);
    const cart = await cartRepository.create("user-001");
    await cartRepository.addItem(cart.id, { variantId: cartVariantId, quantity: 2 });

    const { order } = await useCase.execute({
      userId: "user-001",
      userEmail: "user@example.com",
      address,
      paymentMethod: "pix",
    });

    expect(order.id).toBeDefined();
    expect(order.status).toBe("pending");
    expect(order.userId).toBe("user-001");
  });

  it("should throw EmptyCartError for empty cart", async () => {
    await expect(
      useCase.execute({
        userId: "user-001",
        userEmail: "user@example.com",
        address,
        paymentMethod: "pix",
      }),
    ).rejects.toThrow(EmptyCartError);
  });

  it("should apply idempotency key", async () => {
    await stockRepository.create(cartVariantId, 10);
    const cart = await cartRepository.create("user-001");
    await cartRepository.addItem(cart.id, { variantId: cartVariantId, quantity: 1 });

    const result1 = await useCase.execute({
      userId: "user-001",
      userEmail: "user@example.com",
      address,
      paymentMethod: "pix",
      idempotencyKey: "idem-001",
    });
    const result2 = await useCase.execute({
      userId: "user-001",
      userEmail: "user@example.com",
      address,
      paymentMethod: "pix",
      idempotencyKey: "idem-001",
    });

    expect(result1.order.id).toBe(result2.order.id);
  });

  it("should confirm stock sale", async () => {
    await stockRepository.create(cartVariantId, 10);
    const cart = await cartRepository.create("user-001");
    await cartRepository.addItem(cart.id, { variantId: cartVariantId, quantity: 3 });

    await useCase.execute({
      userId: "user-001",
      userEmail: "user@example.com",
      address,
      paymentMethod: "pix",
    });

    const stock = await stockRepository.findByVariantId(cartVariantId);
    expect(stock?.quantity).toBe(7);
  });

  it("should not commit an order when stock reservation fails", async () => {
    await stockRepository.create(cartVariantId, 1);
    const cart = await cartRepository.create("user-001");
    await cartRepository.addItem(cart.id, { variantId: cartVariantId, quantity: 5 });

    await expect(
      useCase.execute({
        userId: "user-001",
        userEmail: "user@example.com",
        address,
        paymentMethod: "pix",
      }),
    ).rejects.toThrow();

    const orders = await orderRepository.findByUserId("user-001");
    expect(orders).toHaveLength(0);

    const stock = await stockRepository.findByVariantId(cartVariantId);
    expect(stock?.quantity).toBe(1);
  });

  it("should not send order confirmation email when checkout fails", async () => {
    mockAdd.mockClear();
    await stockRepository.create(cartVariantId, 1);
    const cart = await cartRepository.create("user-001");
    await cartRepository.addItem(cart.id, { variantId: cartVariantId, quantity: 10 });

    await expect(
      useCase.execute({
        userId: "user-001",
        userEmail: "user@example.com",
        address,
        paymentMethod: "pix",
      }),
    ).rejects.toThrow();

    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("should create a payment for the order amount in a single call", async () => {
    await stockRepository.create(cartVariantId, 10);
    const cart = await cartRepository.create("user-001");
    await cartRepository.addItem(cart.id, { variantId: cartVariantId, quantity: 2 });

    const { order, payment } = await useCase.execute({
      userId: "user-001",
      userEmail: "user@example.com",
      address,
      paymentMethod: "pix",
    });

    expect(payment).toBeDefined();
    expect(payment.orderId).toBe(order.id);
    expect(payment.method).toBe("pix");
    expect(payment.amountCents).toBe(100000);
  });

  it("should create a payment with the discounted amount when a coupon applies", async () => {
    await stockRepository.create(cartVariantId, 10);
    const coupon = await couponRepository.create({ code: "DESC10", type: "percentage", value: 10 });
    const cart = await cartRepository.create("user-001");
    await cartRepository.addItem(cart.id, { variantId: cartVariantId, quantity: 2 });
    await cartRepository.setCoupon(cart.id, coupon.id);

    const { payment } = await useCase.execute({
      userId: "user-001",
      userEmail: "user@example.com",
      address,
      paymentMethod: "credit_card",
    });

    expect(payment.amountCents).toBe(90000);
  });
});
