import type { PaymentRepository } from '../domain/payment-repository.js'
import type { CreatePaymentInput } from '../domain/payment-repository.js'

export class CreatePaymentUseCase {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(input: CreatePaymentInput) {
    const payment = await this.paymentRepository.create(input)
    return payment
  }
}
