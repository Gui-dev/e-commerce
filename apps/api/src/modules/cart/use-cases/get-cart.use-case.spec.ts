import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryCartRepository } from '../infra/in-memory-cart-repository.js'
import { InMemoryStockRepository } from '../../stock/infra/in-memory-stock-repository.js'
import { GetCartUseCase } from './get-cart.use-case.js'

describe('GetCartUseCase', () => {
  let cartRepository: InMemoryCartRepository
  let useCase: GetCartUseCase

  beforeEach(() => {
    cartRepository = new InMemoryCartRepository()
    useCase = new GetCartUseCase(cartRepository)
  })

  it('should create a new cart if none exists', async () => {
    const cart = await useCase.execute('user-001')

    expect(cart.id).toBeDefined()
    expect(cart.userId).toBe('user-001')
    expect(cart.items).toHaveLength(0)
  })

  it('should return existing cart', async () => {
    const cart1 = await useCase.execute('user-002')
    const cart2 = await useCase.execute('user-002')

    expect(cart1.id).toBe(cart2.id)
  })
})
