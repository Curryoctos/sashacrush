import { describe, expect, it } from 'vitest'
import { validateCreatePayment } from '@/features/payments/validation'

describe('validateCreatePayment', () => {
  it('accepts valid payment input', () => {
    expect(
      validateCreatePayment({
        landId: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
        amountUsd: 50000,
        amountUgx: 185_000_000,
        method: 'manual',
      }),
    ).toBeNull()
  })

  it('rejects missing land id', () => {
    expect(
      validateCreatePayment({
        landId: '',
        amountUsd: 100,
      }),
    ).toBe('Select a land record.')
  })

  it('rejects non-positive USD amount', () => {
    expect(
      validateCreatePayment({
        landId: 'land-id',
        amountUsd: 0,
      }),
    ).toBe('Enter a positive USD amount.')
  })
})
