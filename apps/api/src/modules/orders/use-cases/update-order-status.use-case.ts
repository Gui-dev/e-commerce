import type { OrderRepository } from "../domain/order-repository.js";

export type OrderStatus = "pending" | "confirmed" | "paid" | "shipped" | "delivered" | "cancelled";

export class UpdateOrderStatusUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(id: string, status: OrderStatus) {
    const order = await this.orderRepository.findById(id);
    if (!order) throw new Error("Order not found");
    return this.orderRepository.updateStatus(id, status);
  }
}
