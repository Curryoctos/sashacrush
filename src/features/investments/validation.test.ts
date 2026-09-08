import { describe, expect, it } from 'vitest'
import {
  normalizeInvestmentReference,
  validateCreateInvestment,
} from '@/features/investments/validation'

describe('validateCreateInvestment', () => {
  it('accepts a valid contribution', () => {
    expect(
      validateCreateInvestment({
        amountUsd: 25_000,
        method: 'bank_transfer',
        reference: 'TXN-998877',
      }),
    ).toBeNull()
  })

  it('requires positive amount and reference', () => {
    expect(
      validateCreateInvestment({
        amountUsd: 0,
        method: 'mobile_money',
        reference: 'ABCD',
      }),
    ).toMatch(/positive/i)

    expect(
      validateCreateInvestment({
        amountUsd: 100,
        method: 'other',
        reference: '  ',
      }),
    ).toMatch(/reference/i)

    expect(
      validateCreateInvestment({
        amountUsd: 100,
        method: 'other',
        reference: 'ab',
      }),
    ).toMatch(/4 characters/i)
  })

  it('normalizes whitespace in references', () => {
    expect(normalizeInvestmentReference('  AB  12  ')).toBe('AB 12')
  })
})
