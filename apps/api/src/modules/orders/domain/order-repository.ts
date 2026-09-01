import type { CreateOrderInput, CreatePaymentInput, Order, OrderItem, Payment } from "./order.js";

export type { Order, OrderItem, Payment, CreateOrderInput, CreatePaymentInput } from "./order.js";

export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string): Promise<Order[]>;
  findByIdempotencyKey(key: string): Promise<Order | null>;
  list(): Promise<Order[]>;
  create(input: CreateOrderInput): Promise<Order>;
  addItems(orderId: string, items: CreateOrderInput["items"]): Promise<OrderItem[]>;
  updateStatus(id: string, status: Order["status"]): Promise<Order>;
}

export interface PaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment | null>;
  findByIdempotencyKey(key: string): Promise<Payment | null>;
  create(input: CreatePaymentInput): Promise<Payment>;
  updateStatus(id: string, status: Payment["status"], externalId?: string): Promise<Payment>;
}
