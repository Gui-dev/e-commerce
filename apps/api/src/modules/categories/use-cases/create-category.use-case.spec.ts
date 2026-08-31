import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryCategoryRepository } from '../infra/in-memory-category-repository.js'
import { CreateCategoryUseCase } from './create-category.use-case.js'

describe('CreateCategoryUseCase', () => {
  let repository: InMemoryCategoryRepository
  let useCase: CreateCategoryUseCase

  beforeEach(() => {
    repository = new InMemoryCategoryRepository()
    useCase = new CreateCategoryUseCase(repository)
  })

  it('should create a category', async () => {
    const category = await useCase.execute({
      name: 'Periféricos',
      description: 'Teclados, mouses e outros',
    })

    expect(category.id).toBeDefined()
    expect(category.name).toBe('Periféricos')
    expect(category.slug).toBe('perifericos')
  })

  it('should reject duplicate slug', async () => {
    await useCase.execute({ name: 'Monitores' })
    await expect(useCase.execute({ name: 'Monitores' })).rejects.toThrow('already exists')
  })
})
