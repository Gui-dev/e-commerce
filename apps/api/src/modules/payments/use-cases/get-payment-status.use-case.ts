import type { PaymentRepository } from "../domain/payment-repository.js";

export class GetPaymentStatusUseCase {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(paymentId: string) {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }
    return payment;
  }
}
