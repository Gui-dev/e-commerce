import type { CreateOrderInput, Order, OrderItem } from "./order.js";

export type { Order, OrderItem, CreateOrderInput } from "./order.js";

export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  findItemsByOrderId(orderId: string): Promise<OrderItem[]>;
  findByUserId(userId: string): Promise<Order[]>;
  findByIdempotencyKey(key: string): Promise<Order | null>;
  list(): Promise<Order[]>;
  create(input: CreateOrderInput): Promise<Order>;
  addItems(orderId: string, items: CreateOrderInput["items"]): Promise<OrderItem[]>;
  updateStatus(id: string, status: Order["status"]): Promise<Order>;
}
