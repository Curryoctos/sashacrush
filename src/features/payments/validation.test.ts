import { describe, expect, it } from 'vitest'
import {
  normalizeUgandaPhone,
  validateCreatePayment,
} from '@/features/payments/validation'

const projectId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const reason = 'Seller installment for titled parcel'

describe('validateCreatePayment', () => {
  it('accepts valid manual purchase with reason and reference', () => {
    expect(
      validateCreatePayment({
        projectId,
        disbursementReason: reason,
        amountUsd: 50000,
        amountUgx: 185_000_000,
        method: 'manual',
        manualReference: 'WU-E4EEBC99-123',
      }),
    ).toBeNull()
  })

  it('accepts project purchase with optional land linkage', () => {
    expect(
      validateCreatePayment({
        projectId,
        landId: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
        disbursementReason: reason,
        amountUsd: 2500,
        method: 'manual',
        manualReference: 'WU-PROJECT-123',
      }),
    ).toBeNull()
  })

  it('rejects purchase without project', () => {
    expect(
      validateCreatePayment({
        projectId: '',
        disbursementReason: reason,
        amountUsd: 100,
        method: 'manual',
        manualReference: 'WU-X',
      }),
    ).toMatch(/funding project/)
  })

  it('requires disbursement reason', () => {
    expect(
      validateCreatePayment({
        projectId,
        disbursementReason: 'ab',
        amountUsd: 100,
        method: 'manual',
        manualReference: 'WU-X',
      }),
    ).toMatch(/disbursement reason/)
  })

  it('requires manual reference for manual payouts', () => {
    expect(
      validateCreatePayment({
        projectId,
        disbursementReason: reason,
        amountUsd: 100,
        method: 'manual',
      }),
    ).toMatch(/reconciliation reference/)
  })

  it('accepts crypto when an on-chain reference is present', () => {
    expect(
      validateCreatePayment({
        projectId,
        disbursementReason: reason,
        amountUsd: 100,
        method: 'crypto',
        manualReference: '0xabc123',
      }),
    ).toBeNull()
  })

  it('requires a tx reference for crypto', () => {
    expect(
      validateCreatePayment({
        projectId,
        disbursementReason: reason,
        amountUsd: 100,
        method: 'crypto',
      }),
    ).toMatch(/transaction reference/)
  })

  it('rejects stripe card payouts', () => {
    expect(
      validateCreatePayment({
        projectId,
        disbursementReason: reason,
        amountUsd: 100,
        method: 'stripe',
      }),
    ).toMatch(/Card payouts are not available/)
  })

  it('rejects non-positive USD amount', () => {
    expect(
      validateCreatePayment({
        projectId,
        disbursementReason: reason,
        amountUsd: 0,
      }),
    ).toBe('Enter a positive USD amount.')
  })

  it('requires network, UGX, and payee phone for mobile money', () => {
    expect(
      validateCreatePayment({
        projectId,
        disbursementReason: reason,
        amountUsd: 100,
        method: 'flutterwave',
      }),
    ).toBe('Choose MTN MoMo or Airtel Money.')

    expect(
      validateCreatePayment({
        projectId,
        disbursementReason: reason,
        amountUsd: 100,
        method: 'flutterwave',
        mobileMoneyNetwork: 'mtn',
      }),
    ).toBe('Enter the UGX amount for the mobile-money payout.')

    expect(
      validateCreatePayment({
        projectId,
        disbursementReason: reason,
        amountUsd: 100,
        amountUgx: 370_000,
        method: 'flutterwave',
        mobileMoneyNetwork: 'mtn',
      }),
    ).toMatch(/phone number/)
  })

  it('accepts MTN and Airtel with payee phone', () => {
    for (const network of ['mtn', 'airtel'] as const) {
      expect(
        validateCreatePayment({
          projectId,
          disbursementReason: reason,
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
        projectId,
        disbursementReason: reason,
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

  it('rejects amount above project funding goal', () => {
    expect(
      validateCreatePayment({
        projectId,
        disbursementReason: reason,
        amountUsd: 400_000,
        totalValueUsd: 300_000,
      }),
    ).toMatch(/funding goal/)
  })

  it('rejects amount above available-to-pay-out', () => {
    expect(
      validateCreatePayment({
        projectId,
        disbursementReason: reason,
        amountUsd: 60_000,
        availableToPayOutUsd: 50_000,
      }),
    ).toMatch(/available-to-pay-out/)
  })

  it('rejects amount above company capital available', () => {
    expect(
      validateCreatePayment({
        projectId,
        disbursementReason: reason,
        amountUsd: 12_000,
        companyCapitalAvailableUsd: 5_000,
      }),
    ).toMatch(/company capital available/)
  })
})
