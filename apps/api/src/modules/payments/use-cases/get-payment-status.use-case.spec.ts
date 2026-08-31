import { describe, it, expect, beforeEach } from 'vitest'
import { GetPaymentStatusUseCase } from './get-payment-status.use-case.js'
import { InMemoryPaymentRepository } from '../infra/in-memory-payment-repository.js'

describe('GetPaymentStatusUseCase', () => {
  let repository: InMemoryPaymentRepository
  let useCase: GetPaymentStatusUseCase

  beforeEach(() => {
    repository = new InMemoryPaymentRepository()
    useCase = new GetPaymentStatusUseCase(repository)
  })

  it('should get payment status', async () => {
    const payment = await repository.create({
      orderId: 'order-001',
      method: 'pix',
      amountCents: 10000,
    })

    const result = await useCase.execute(payment.id)
    expect(result.id).toBe(payment.id)
    expect(result.status).toBe('pending')
  })

  it('should throw error if payment not found', async () => {
    await expect(useCase.execute('non-existent-id')).rejects.toThrow('Payment not found')
  })
})
