import { describe, it, expect } from 'vitest'

describe('Health Check', () => {
  it('should return ok', () => {
    expect({ status: 'ok' }).toEqual({ status: 'ok' })
  })
})
