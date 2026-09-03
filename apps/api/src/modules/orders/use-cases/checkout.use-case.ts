import { withTransaction } from "../../../lib/db/transaction.js";
import { emailQueue } from "../../../queues/email.queue.js";
import type { CartRepository } from "../../cart/domain/cart-repository.js";
import { EmptyCartError } from "../../cart/domain/cart.js";
import type { CouponRepository } from "../../coupons/domain/coupon-repository.js";
import type { ProductRepository } from "../../products/domain/product-repository.js";
import type { StockRepository } from "../../stock/domain/stock-repository.js";
import { InsufficientStockError } from "../../stock/domain/stock.js";
import type { Order, OrderRepository } from "../domain/order-repository.js";
import type { ShippingAddress } from "../domain/shipping-address.js";

export interface CheckoutInput {
  userId: string;
  userEmail: string;
  address: ShippingAddress;
  idempotencyKey?: string;
}

export class CheckoutUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartRepository: CartRepository,
    private readonly stockRepository: StockRepository,
    private readonly couponRepository: CouponRepository,
    private readonly productRepository: ProductRepository,
    private readonly transactional: (
      fn: (tx: unknown) => Promise<Order>,
    ) => Promise<Order> = withTransaction,
  ) {}

  async execute(input: CheckoutInput): Promise<Order> {
    if (input.idempotencyKey) {
      const existing = await this.orderRepository.findByIdempotencyKey(input.idempotencyKey);
      if (existing) return existing;
    }

    const order = await this.transactional(async () => {
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
          let subtotal = 0;
          for (const item of cart.items) {
            const variant = await this.productRepository.findVariantById(item.variantId);
            const product = variant
              ? await this.productRepository.findById(variant.productId)
              : null;
            const price = variant?.priceCents ?? product?.priceCents ?? 0;
            subtotal += item.quantity * price;
          }
          if (coupon.type === "percentage") {
            discountCents = Math.floor((subtotal * coupon.value) / 100);
          } else {
            discountCents = Math.min(coupon.value, subtotal);
          }
          await this.couponRepository.incrementUsedCount(coupon.id);
        }
      }

      const orderItems = [];
      for (const item of cart.items) {
        const variant = await this.productRepository.findVariantById(item.variantId);
        const product = variant ? await this.productRepository.findById(variant.productId) : null;
        const unitPriceCents = variant?.priceCents ?? product?.priceCents ?? 0;
        orderItems.push({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPriceCents,
        });
      }

      const created = await this.orderRepository.create({
        userId: input.userId,
        items: orderItems,
        couponId,
        discountCents,
        idempotencyKey: input.idempotencyKey,
        shipping: input.address,
      });

      await this.orderRepository.addItems(created.id, orderItems);

      for (const item of cart.items) {
        await this.stockRepository.confirmSale(item.variantId, item.quantity);
      }

      await this.cartRepository.clearCart(cart.id);

      return created;
    });

    await emailQueue.add("order-confirmation", {
      to: input.userEmail,
      subject: `Order ${order.id} confirmed`,
      html: `<h1>Thank you for your order!</h1><p>Order ID: ${order.id}</p>`,
    });

    return order;
  }
}
