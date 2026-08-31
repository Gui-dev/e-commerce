import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryCartRepository } from '../infra/in-memory-cart-repository.js'
import { InMemoryStockRepository } from '../../stock/infra/in-memory-stock-repository.js'
import { UpdateCartItemUseCase } from './update-cart-item.use-case.js'

describe('UpdateCartItemUseCase', () => {
  let cartRepository: InMemoryCartRepository
  let stockRepository: InMemoryStockRepository
  let useCase: UpdateCartItemUseCase

  beforeEach(() => {
    cartRepository = new InMemoryCartRepository()
    stockRepository = new InMemoryStockRepository()
    useCase = new UpdateCartItemUseCase(cartRepository, stockRepository)
  })

  it('should update cart item quantity', async () => {
    await stockRepository.create('var-001', 10)
    const cart = await cartRepository.create('user-001')
    const item = await cartRepository.addItem(cart.id, {
      variantId: 'var-001',
      quantity: 2,
    })

    const updated = await useCase.execute('user-001', item.id, 5)

    expect(updated.quantity).toBe(5)
  })

  it('should throw when insufficient stock', async () => {
    await stockRepository.create('var-001', 5)
    const cart = await cartRepository.create('user-001')
    const item = await cartRepository.addItem(cart.id, {
      variantId: 'var-001',
      quantity: 2,
    })

    await expect(useCase.execute('user-001', item.id, 20)).rejects.toThrow('Insufficient stock')
  })
})
