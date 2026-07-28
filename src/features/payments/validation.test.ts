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

  it('requires a network and UGX amount for mobile money', () => {
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
    ).toBe('Enter the UGX amount for mobile-money checkout.')
  })

  it('accepts MTN and Airtel mobile-money payments', () => {
    for (const network of ['mtn', 'airtel'] as const) {
      expect(
        validateCreatePayment({
          landId: 'land-id',
          amountUsd: 100,
          amountUgx: 370_000,
          method: 'flutterwave',
          mobileMoneyNetwork: network,
        }),
      ).toBeNull()
    }
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

  it('rejects amount above remaining outstanding', () => {
    expect(
      validateCreatePayment({
        landId: 'land-id',
        amountUsd: 60_000,
        remainingOutstandingUsd: 50_000,
      }),
    ).toMatch(/exceeds remaining outstanding/)
  })
})
