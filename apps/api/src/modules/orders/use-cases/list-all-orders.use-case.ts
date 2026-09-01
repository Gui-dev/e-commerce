import type { OrderRepository } from "../domain/order-repository.js";

export class ListAllOrdersUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute() {
    return this.orderRepository.list();
  }
}
