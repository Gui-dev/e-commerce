import type { OrderRepository } from "../domain/order-repository.js";

export class GetOrderAdminUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(id: string) {
    const order = await this.orderRepository.findById(id);
    if (!order) throw new Error("Order not found");
    return order;
  }
}
