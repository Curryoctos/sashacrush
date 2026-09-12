import { describe, expect, it } from 'vitest'
import {
  normalizeUgandaPhone,
  validateCreatePayment,
} from '@/features/payments/validation'

describe('validateCreatePayment', () => {
  it('accepts valid manual payout with reference', () => {
    expect(
      validateCreatePayment({
        landId: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
        amountUsd: 50000,
        amountUgx: 185_000_000,
        method: 'manual',
        manualReference: 'WU-E4EEBC99-123',
      }),
    ).toBeNull()
  })

  it('requires manual reference for manual payouts', () => {
    expect(
      validateCreatePayment({
        landId: 'land-id',
        amountUsd: 100,
        method: 'manual',
      }),
    ).toMatch(/reconciliation reference/)
  })

  it('rejects crypto until conversion kit ships', () => {
    expect(
      validateCreatePayment({
        landId: 'land-id',
        amountUsd: 100,
        method: 'crypto',
      }),
    ).toMatch(/not available yet/)
  })

  it('rejects stripe card payouts', () => {
    expect(
      validateCreatePayment({
        landId: 'land-id',
        amountUsd: 100,
        method: 'stripe',
      }),
    ).toMatch(/Card payouts are not available/)
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

  it('requires network, UGX, and seller phone for mobile money', () => {
    expect(
      validateCreatePayment({
        landId: 'land-id',
        amountUsd: 100,
        method: 'flutterwave',
      }),
    ).toBe('Choose MTN MoMo or Airtel Money.')

    expect(
      validateCreatePayment({
        landId: 'land-id',
        amountUsd: 100,
        method: 'flutterwave',
        mobileMoneyNetwork: 'mtn',
      }),
    ).toBe('Enter the UGX amount for the mobile-money payout.')

    expect(
      validateCreatePayment({
        landId: 'land-id',
        amountUsd: 100,
        amountUgx: 370_000,
        method: 'flutterwave',
        mobileMoneyNetwork: 'mtn',
      }),
    ).toMatch(/phone number/)
  })

  it('accepts MTN and Airtel with seller phone', () => {
    for (const network of ['mtn', 'airtel'] as const) {
      expect(
        validateCreatePayment({
          landId: 'land-id',
          amountUsd: 100,
          amountUgx: 370_000,
          method: 'flutterwave',
          mobileMoneyNetwork: network,
          recipientPhone: '+256700000000',
        }),
      ).toBeNull()
    }
  })

  it('rejects invalid Uganda phone format with a clear message', () => {
    expect(
      validateCreatePayment({
        landId: 'land-id',
        amountUsd: 100,
        amountUgx: 370_000,
        method: 'flutterwave',
        mobileMoneyNetwork: 'mtn',
        recipientPhone: '12345',
      }),
    ).toMatch(/valid Uganda phone/)
  })

  it('normalizes Uganda phone numbers', () => {
    expect(normalizeUgandaPhone('0700123456')).toBe('+256700123456')
    expect(normalizeUgandaPhone('+256700123456')).toBe('+256700123456')
    expect(normalizeUgandaPhone('bad')).toBeNull()
  })

  it('rejects amount above deal total', () => {
    expect(
      validateCreatePayment({
        landId: 'land-id',
        amountUsd: 400_000,
        totalValueUsd: 300_000,
      }),
    ).toMatch(/exceeds deal total/)
  })

  it('rejects amount above available-to-pay-out', () => {
    expect(
      validateCreatePayment({
        landId: 'land-id',
        amountUsd: 60_000,
        availableToPayOutUsd: 50_000,
      }),
    ).toMatch(/available-to-pay-out/)
  })
})
