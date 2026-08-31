import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryProductRepository } from '../infra/in-memory-product-repository.js'
import { CreateProductUseCase } from './create-product.use-case.js'

describe('CreateProductUseCase', () => {
  let repository: InMemoryProductRepository
  let useCase: CreateProductUseCase

  beforeEach(() => {
    repository = new InMemoryProductRepository()
    useCase = new CreateProductUseCase(repository)
  })

  it('should create a product with valid input', async () => {
    const product = await useCase.execute({
      name: 'Teclado Mecânico Wireless Apex Pro',
      description: 'Switches óptico-magnéticos ajustáveis com iluminação RGB por tecla.',
      categoryId: 'cat-001',
      priceCents: 89990,
      skuPrefix: 'KRN-KB',
    })

    expect(product.id).toBeDefined()
    expect(product.name).toBe('Teclado Mecânico Wireless Apex Pro')
    expect(product.slug).toBe('teclado-mecanico-wireless-apex-pro')
    expect(product.priceCents).toBe(89990)
    expect(product.skuPrefix).toBe('KRN-KB')
    expect(product.isActive).toBe(true)
  })

  it('should persist the product in the repository', async () => {
    const created = await useCase.execute({
      name: 'Monitor UltraWide 34" Curved 144Hz',
      description: 'Painel QD-OLED de alta precisão com suporte a HDR600 e G-Sync.',
      categoryId: 'cat-002',
      priceCents: 279900,
      skuPrefix: 'KRN-MN',
    })

    const stored = await repository.findById(created.id)
    expect(stored?.name).toBe('Monitor UltraWide 34" Curved 144Hz')
  })

  it('should generate a slug from the product name', async () => {
    const product = await useCase.execute({
      name: 'Headset Pro Wireless ANC 7.1',
      description: 'Cancelamento ativo de ruído, 40 horas de bateria e microfone studio.',
      categoryId: 'cat-003',
      priceCents: 64900,
      skuPrefix: 'KRN-HS',
    })

    expect(product.slug).toBe('headset-pro-wireless-anc-71')
  })

  it('should reject a product with empty name', async () => {
    await expect(
      useCase.execute({
        name: '',
        description: 'Test',
        categoryId: 'cat-001',
        priceCents: 10000,
        skuPrefix: 'T',
      }),
    ).rejects.toThrow()
  })

  it('should reject a product with short description', async () => {
    await expect(
      useCase.execute({
        name: 'Product',
        description: 'Short',
        categoryId: 'cat-001',
        priceCents: 10000,
        skuPrefix: 'P',
      }),
    ).rejects.toThrow()
  })

  it('should reject duplicate slug', async () => {
    await useCase.execute({
      name: 'Teclado',
      description: 'Teclado mecânico de alta performance',
      categoryId: 'cat-001',
      priceCents: 50000,
      skuPrefix: 'KB',
    })

    await expect(
      useCase.execute({
        name: 'Teclado',
        description: 'Outro teclado mecânico de alta performance',
        categoryId: 'cat-001',
        priceCents: 60000,
        skuPrefix: 'KB2',
      }),
    ).rejects.toThrow('already exists')
  })
})
