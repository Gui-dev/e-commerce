import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryCategoryRepository } from '../infra/in-memory-category-repository.js'
import { ListCategoriesUseCase } from './list-categories.use-case.js'
import { CreateCategoryUseCase } from './create-category.use-case.js'

describe('ListCategoriesUseCase', () => {
  let repository: InMemoryCategoryRepository
  let listUseCase: ListCategoriesUseCase
  let createUseCase: CreateCategoryUseCase

  beforeEach(() => {
    repository = new InMemoryCategoryRepository()
    listUseCase = new ListCategoriesUseCase(repository)
    createUseCase = new CreateCategoryUseCase(repository)
  })

  it('should return empty list when no categories exist', async () => {
    const result = await listUseCase.execute()
    expect(result).toEqual([])
  })

  it('should return all categories', async () => {
    await createUseCase.execute({ name: 'Periféricos' })
    await createUseCase.execute({ name: 'Monitores' })

    const result = await listUseCase.execute()
    expect(result).toHaveLength(2)
  })
})
