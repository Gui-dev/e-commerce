import { emailQueue } from "../../../queues/email.queue.js";
import type { CartRepository } from "../../cart/domain/cart-repository.js";
import { EmptyCartError } from "../../cart/domain/cart.js";
import type { CouponRepository } from "../../coupons/domain/coupon-repository.js";
import type { StockRepository } from "../../stock/domain/stock-repository.js";
import { InsufficientStockError } from "../../stock/domain/stock.js";
import type { Order, OrderRepository } from "../domain/order-repository.js";

export interface CheckoutInput {
  userId: string;
  idempotencyKey?: string;
}

export class CheckoutUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartRepository: CartRepository,
    private readonly stockRepository: StockRepository,
    private readonly couponRepository: CouponRepository,
  ) {}

  async execute(input: CheckoutInput): Promise<Order> {
    if (input.idempotencyKey) {
      const existing = await this.orderRepository.findByIdempotencyKey(input.idempotencyKey);
      if (existing) return existing;
    }

    const cart = await this.cartRepository.findByUserId(input.userId);
    if (!cart || cart.items.length === 0) {
      throw new EmptyCartError();
    }

    for (const item of cart.items) {
      const stock = await this.stockRepository.findByVariantId(item.variantId);
      if (!stock) {
        throw new InsufficientStockError(item.variantId, item.quantity, 0);
      }
      const available = stock.quantity - stock.reserved;
      if (available < item.quantity) {
        throw new InsufficientStockError(item.variantId, item.quantity, available);
      }
    }

    let discountCents = 0;
    const couponId = cart.couponId;

    if (cart.couponId) {
      const coupon = await this.couponRepository.findById(cart.couponId);
      if (coupon) {
        const subtotal = cart.items.reduce((sum, item) => sum + item.quantity * 50000, 0);
        if (coupon.type === "percentage") {
          discountCents = Math.floor((subtotal * coupon.value) / 100);
        } else {
          discountCents = Math.min(coupon.value, subtotal);
        }
        await this.couponRepository.incrementUsedCount(coupon.id);
      }
    }

    const orderItems = cart.items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      unitPriceCents: 50000,
    }));

    const order = await this.orderRepository.create({
      userId: input.userId,
      items: orderItems,
      couponId,
      discountCents,
      idempotencyKey: input.idempotencyKey,
    });

    await this.orderRepository.addItems(order.id, orderItems);

    for (const item of cart.items) {
      await this.stockRepository.confirmSale(item.variantId, item.quantity);
    }

    await this.cartRepository.clearCart(cart.id);

    await emailQueue.add("order-confirmation", {
      to: "customer@example.com",
      subject: `Order ${order.id} confirmed`,
      html: `<h1>Thank you for your order!</h1><p>Order ID: ${order.id}</p>`,
    });

    return order;
  }
}
