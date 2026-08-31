import { describe, it, expect, beforeEach } from 'vitest'
import { ProcessWebhookUseCase } from './process-webhook.use-case.js'
import { InMemoryWebhookRepository } from '../infra/in-memory-webhook-repository.js'
import { InMemoryPaymentRepository } from '../../payments/infra/in-memory-payment-repository.js'

describe('ProcessWebhookUseCase', () => {
  let webhookRepository: InMemoryWebhookRepository
  let paymentRepository: InMemoryPaymentRepository
  let useCase: ProcessWebhookUseCase

  beforeEach(() => {
    webhookRepository = new InMemoryWebhookRepository()
    paymentRepository = new InMemoryPaymentRepository()
    useCase = new ProcessWebhookUseCase(webhookRepository, paymentRepository)
  })

  it('should process payment approved webhook', async () => {
    const payment = await paymentRepository.create({
      orderId: 'order-001',
      method: 'pix',
      amountCents: 10000,
    })

    const result = await useCase.execute({
      event: 'payment.approved',
      paymentId: payment.id,
      externalId: 'ext-001',
      timestamp: new Date().toISOString(),
    })

    expect(result.status).toBe('approved')
    expect(result.paymentId).toBe(payment.id)

    const updatedPayment = await paymentRepository.findById(payment.id)
    expect(updatedPayment?.status).toBe('approved')
    expect(updatedPayment?.externalId).toBe('ext-001')
  })

  it('should process payment rejected webhook', async () => {
    const payment = await paymentRepository.create({
      orderId: 'order-002',
      method: 'credit_card',
      amountCents: 25000,
    })

    const result = await useCase.execute({
      event: 'payment.rejected',
      paymentId: payment.id,
      externalId: 'ext-002',
      timestamp: new Date().toISOString(),
    })

    expect(result.status).toBe('rejected')

    const updatedPayment = await paymentRepository.findById(payment.id)
    expect(updatedPayment?.status).toBe('rejected')
  })

  it('should throw error if payment not found', async () => {
    await expect(
      useCase.execute({
        event: 'payment.approved',
        paymentId: 'non-existent-id',
        externalId: 'ext-003',
        timestamp: new Date().toISOString(),
      }),
    ).rejects.toThrow('Payment not found')
  })
})
