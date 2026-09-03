import type {
  CreateOrderInput,
  Order,
  OrderItem,
  OrderRepository,
} from "../domain/order-repository.js";
import { OrderNotFoundError } from "../domain/order.js";

export class InMemoryOrderRepository implements OrderRepository {
  private orders: Map<string, Order> = new Map();
  private items: Map<string, OrderItem> = new Map();
  private nextId = 1;

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => o.userId === userId);
  }

  async findByIdempotencyKey(key: string): Promise<Order | null> {
    for (const order of this.orders.values()) {
      if (order.idempotencyKey === key) return order;
    }
    return null;
  }

  async list(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async create(input: CreateOrderInput): Promise<Order> {
    const now = new Date();
    const order: Order = {
      id: `order-${this.nextId++}`,
      userId: input.userId,
      status: "pending",
      subtotalCents: input.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0),
      discountCents: input.discountCents ?? 0,
      totalCents:
        input.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0) -
        (input.discountCents ?? 0),
      couponId: input.couponId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(order.id, order);
    return order;
  }

  async addItems(orderId: string, items: CreateOrderInput["items"]): Promise<OrderItem[]> {
    const created: OrderItem[] = [];

    for (const item of items) {
      const orderItem: OrderItem = {
        id: `item-${this.nextId++}`,
        orderId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
      };
      this.items.set(orderItem.id, orderItem);
      created.push(orderItem);
    }

    return created;
  }

  async findItemsByOrderId(orderId: string): Promise<OrderItem[]> {
    return Array.from(this.items.values()).filter((item) => item.orderId === orderId);
  }

  async updateStatus(id: string, status: Order["status"]): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) throw new OrderNotFoundError(id);

    const updated: Order = {
      ...order,
      status,
      updatedAt: new Date(),
    };

    this.orders.set(id, updated);
    return updated;
  }
}
