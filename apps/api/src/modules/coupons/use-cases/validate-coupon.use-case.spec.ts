import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryCouponRepository } from '../infra/in-memory-coupon-repository.js'
import { ValidateCouponUseCase } from './validate-coupon.use-case.js'

describe('ValidateCouponUseCase', () => {
  let repository: InMemoryCouponRepository
  let useCase: ValidateCouponUseCase

  beforeEach(() => {
    repository = new InMemoryCouponRepository()
    useCase = new ValidateCouponUseCase(repository)
  })

  it('should validate a percentage coupon', async () => {
    await repository.create({
      code: 'DESCONTO10',
      type: 'percentage',
      value: 10,
    })

    const result = await useCase.execute('DESCONTO10', 10000)

    expect(result.valid).toBe(true)
    expect(result.discountCents).toBe(1000)
  })

  it('should validate a fixed coupon', async () => {
    await repository.create({
      code: 'FIXO50',
      type: 'fixed',
      value: 5000,
    })

    const result = await useCase.execute('FIXO50', 10000)

    expect(result.valid).toBe(true)
    expect(result.discountCents).toBe(5000)
  })

  it('should reject non-existent coupon', async () => {
    const result = await useCase.execute('INVALID', 10000)
    expect(result.valid).toBe(false)
  })

  it('should reject expired coupon', async () => {
    await repository.create({
      code: 'EXPIRED',
      type: 'percentage',
      value: 10,
      expiresAt: new Date('2020-01-01'),
    })

    const result = await useCase.execute('EXPIRED', 10000)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('expired')
  })

  it('should reject coupon below minimum order', async () => {
    await repository.create({
      code: 'MIN100',
      type: 'percentage',
      value: 10,
      minOrderCents: 10000,
    })

    const result = await useCase.execute('MIN100', 5000)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Minimum order')
  })

  it('should cap fixed coupon discount at order total', async () => {
    await repository.create({
      code: 'BIG',
      type: 'fixed',
      value: 50000,
    })

    const result = await useCase.execute('BIG', 10000)
    expect(result.discountCents).toBe(10000)
  })
})
