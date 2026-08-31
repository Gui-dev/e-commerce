import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryProductRepository } from '../infra/in-memory-product-repository.js'
import { GetProductBySlugUseCase } from './get-product-by-slug.use-case.js'
import { CreateProductUseCase } from './create-product.use-case.js'
import { ProductNotFoundError } from '../domain/product.js'

describe('GetProductBySlugUseCase', () => {
  let repository: InMemoryProductRepository
  let useCase: GetProductBySlugUseCase
  let createUseCase: CreateProductUseCase

  beforeEach(() => {
    repository = new InMemoryProductRepository()
    useCase = new GetProductBySlugUseCase(repository)
    createUseCase = new CreateProductUseCase(repository)
  })

  it('should return a product with variants', async () => {
    const product = await createUseCase.execute({
      name: 'Teclado Mecânico',
      description: 'Switches óptico-magnéticos ajustáveis com iluminação RGB.',
      categoryId: 'cat-001',
      priceCents: 89990,
      skuPrefix: 'KRN-KB',
    })

    await repository.createVariant(product.id, {
      name: 'Branco',
      sku: 'KRN-KB-01-WHT',
      attributes: { color: 'white' },
    })
    await repository.createVariant(product.id, {
      name: 'Preto',
      sku: 'KRN-KB-01-BLK',
      attributes: { color: 'black' },
    })

    const result = await useCase.execute('teclado-mecanico')

    expect(result.name).toBe('Teclado Mecânico')
    expect(result.variants).toHaveLength(2)
    expect(result.variants[0].sku).toBe('KRN-KB-01-WHT')
  })

  it('should throw ProductNotFoundError for non-existent slug', async () => {
    await expect(useCase.execute('non-existent')).rejects.toThrow(ProductNotFoundError)
  })

  it('should return product with empty variants array', async () => {
    await createUseCase.execute({
      name: 'Mouse Simples',
      description: 'Mouse básico de alta performance para uso diário.',
      categoryId: 'cat-001',
      priceCents: 50000,
      skuPrefix: 'MS',
    })

    const result = await useCase.execute('mouse-simples')

    expect(result.name).toBe('Mouse Simples')
    expect(result.variants).toHaveLength(0)
  })
})
