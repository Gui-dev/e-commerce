import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryStockRepository } from '../infra/in-memory-stock-repository.js'
import { ReserveStockUseCase } from './reserve-stock.use-case.js'
import { StockNotFoundError, InsufficientStockError } from '../domain/stock.js'

describe('ReserveStockUseCase', () => {
  let repository: InMemoryStockRepository
  let useCase: ReserveStockUseCase

  beforeEach(() => {
    repository = new InMemoryStockRepository()
    useCase = new ReserveStockUseCase(repository)
  })

  it('should reserve stock successfully', async () => {
    await repository.create('var-001', 10)

    const result = await useCase.execute('var-001', 3)

    expect(result.reserved).toBe(3)
    expect(result.quantity).toBe(10)
  })

  it('should throw StockNotFoundError for non-existent variant', async () => {
    await expect(useCase.execute('non-existent', 1)).rejects.toThrow(StockNotFoundError)
  })

  it('should throw InsufficientStockError when not enough stock', async () => {
    await repository.create('var-002', 5)

    await expect(useCase.execute('var-002', 10)).rejects.toThrow(InsufficientStockError)
  })

  it('should account for already reserved stock', async () => {
    await repository.create('var-003', 10)
    await repository.reserve('var-003', 7)

    await expect(useCase.execute('var-003', 5)).rejects.toThrow(InsufficientStockError)
  })
})
