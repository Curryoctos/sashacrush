import { describe, expect, it } from 'vitest'
import {
  investmentMethodLabel,
  normalizeInvestmentReference,
  validateCreateInvestment,
} from '@/features/investments/validation'

describe('validateCreateInvestment', () => {
  it('accepts a valid offline contribution', () => {
    expect(
      validateCreateInvestment({
        amountUsd: 25_000,
        method: 'bank_transfer',
        reference: 'TXN-998877',
      }),
    ).toBeNull()
  })

  it('accepts Stripe without a reference (min $0.50)', () => {
    expect(
      validateCreateInvestment({
        amountUsd: 100,
        method: 'stripe',
      }),
    ).toBeNull()

    expect(
      validateCreateInvestment({
        amountUsd: 0.4,
        method: 'stripe',
      }),
    ).toMatch(/0\.50/i)
  })

  it('requires positive amount and reference for offline methods', () => {
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

  it('labels Stripe method', () => {
    expect(investmentMethodLabel('stripe')).toBe('Card (Stripe)')
  })
})
