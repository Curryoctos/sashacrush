import { describe, expect, it } from 'vitest'
import {
  investmentMethodLabel,
  normalizeInvestmentReference,
  validateCreateInvestment,
} from '@/features/investments/validation'

const landId = '11111111-1111-1111-1111-111111111111'

describe('validateCreateInvestment', () => {
  it('accepts a valid offline contribution toward a deal', () => {
    expect(
      validateCreateInvestment({
        landId,
        amountUsd: 25_000,
        method: 'bank_transfer',
        reference: 'TXN-998877',
      }),
    ).toBeNull()
  })

  it('requires a deal', () => {
    expect(
      validateCreateInvestment({
        landId: '',
        amountUsd: 100,
        method: 'stripe',
      }),
    ).toMatch(/deal/i)
  })

  it('accepts Stripe without a reference (min $0.50)', () => {
    expect(
      validateCreateInvestment({
        landId,
        amountUsd: 100,
        method: 'stripe',
      }),
    ).toBeNull()

    expect(
      validateCreateInvestment({
        landId,
        amountUsd: 0.4,
        method: 'stripe',
      }),
    ).toMatch(/0\.50/i)
  })

  it('requires positive amount and reference for offline methods', () => {
    expect(
      validateCreateInvestment({
        landId,
        amountUsd: 0,
        method: 'mobile_money',
        reference: 'ABCD',
      }),
    ).toMatch(/positive/i)

    expect(
      validateCreateInvestment({
        landId,
        amountUsd: 100,
        method: 'other',
        reference: '  ',
      }),
    ).toMatch(/reference/i)

    expect(
      validateCreateInvestment({
        landId,
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
