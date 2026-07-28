import { describe, expect, it } from 'vitest'
import {
  flutterwaveAmountMatches,
  stripeAmountMatches,
} from '../../../supabase/functions/_shared/paymentAmountGuard.ts'

describe('paymentAmountGuard', () => {
  it('accepts matching Stripe USD cents', () => {
    expect(stripeAmountMatches(5_000_000, 50_000, 'usd')).toBe(true)
    expect(stripeAmountMatches(5_000_000, 50_000, 'USD')).toBe(true)
  })

  it('rejects Stripe underpay / wrong currency', () => {
    expect(stripeAmountMatches(4_999_000, 50_000, 'usd')).toBe(false)
    expect(stripeAmountMatches(5_000_000, 50_000, 'ugx')).toBe(false)
    expect(stripeAmountMatches(null, 50_000, 'usd')).toBe(false)
  })

  it('accepts matching Flutterwave UGX and USD', () => {
    expect(
      flutterwaveAmountMatches({
        paidAmount: 185_000_000,
        paidCurrency: 'UGX',
        expectedUsd: 50_000,
        expectedUgx: 185_000_000,
      }),
    ).toBe(true)

    expect(
      flutterwaveAmountMatches({
        paidAmount: 50_000,
        paidCurrency: 'USD',
        expectedUsd: 50_000,
        expectedUgx: null,
      }),
    ).toBe(true)
  })

  it('rejects Flutterwave amount mismatch', () => {
    expect(
      flutterwaveAmountMatches({
        paidAmount: 1_000,
        paidCurrency: 'UGX',
        expectedUsd: 50_000,
        expectedUgx: 185_000_000,
      }),
    ).toBe(false)
  })
})
