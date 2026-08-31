import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryProductRepository } from '../infra/in-memory-product-repository.js'
import { CreateVariantUseCase } from './create-variant.use-case.js'
import { CreateProductUseCase } from './create-product.use-case.js'
import { ProductNotFoundError } from '../domain/product.js'

describe('CreateVariantUseCase', () => {
  let repository: InMemoryProductRepository
  let useCase: CreateVariantUseCase
  let createProduct: CreateProductUseCase

  beforeEach(() => {
    repository = new InMemoryProductRepository()
    useCase = new CreateVariantUseCase(repository)
    createProduct = new CreateProductUseCase(repository)
  })

  it('should create a variant for a product', async () => {
    const product = await createProduct.execute({
      name: 'Teclado Mecânico',
      description: 'Switches óptico-magnéticos ajustáveis com iluminação RGB.',
      categoryId: 'cat-001',
      priceCents: 89990,
      skuPrefix: 'KRN-KB',
    })

    const variant = await useCase.execute({
      productId: product.id,
      name: 'Branco',
      sku: 'KRN-KB-01-WHT',
      attributes: { color: 'white' },
    })

    expect(variant.id).toBeDefined()
    expect(variant.sku).toBe('KRN-KB-01-WHT')
    expect(variant.attributes).toEqual({ color: 'white' })
  })

  it('should throw ProductNotFoundError for non-existent product', async () => {
    await expect(
      useCase.execute({
        productId: 'non-existent',
        name: 'Variant',
        sku: 'VAR-01',
      }),
    ).rejects.toThrow(ProductNotFoundError)
  })

  it('should reject duplicate SKU', async () => {
    const product = await createProduct.execute({
      name: 'Mouse',
      description: 'Mouse gamer de alta performance',
      categoryId: 'cat-001',
      priceCents: 50000,
      skuPrefix: 'MS',
    })

    await useCase.execute({
      productId: product.id,
      name: 'Preto',
      sku: 'MS-BLK',
    })

    await expect(
      useCase.execute({
        productId: product.id,
        name: 'Branco',
        sku: 'MS-BLK',
      }),
    ).rejects.toThrow('already exists')
  })
})
