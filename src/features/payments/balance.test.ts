import { describe, expect, it } from 'vitest'
import { computeDealBalance } from '@/features/payments/balance'

describe('computeDealBalance', () => {
  it('computes paid, pending, outstanding, and available-to-pay-out', () => {
    expect(
      computeDealBalance(100_000, [
        { amount_usd: 40_000, status: 'confirmed' },
        { amount_usd: 15_000, status: 'pending' },
        { amount_usd: 5_000, status: 'pending_manual' },
      ]),
    ).toEqual({
      totalValueUsd: 100_000,
      paidUsd: 40_000,
      pendingUsd: 20_000,
      outstandingUsd: 60_000,
      availableToPayOutUsd: 40_000,
      availableToCollectUsd: 40_000,
    })
  })

  it('treats empty payments as fully available', () => {
    const balance = computeDealBalance(80_000, [])
    expect(balance.availableToPayOutUsd).toBe(80_000)
    expect(balance.availableToCollectUsd).toBe(80_000)
  })

  it('clamps available when pending exceeds outstanding', () => {
    const balance = computeDealBalance(10_000, [
      { amount_usd: 8_000, status: 'confirmed' },
      { amount_usd: 5_000, status: 'pending' },
    ])
    expect(balance.availableToPayOutUsd).toBe(0)
  })

  it('does not treat failed payouts as pending (frees available balance)', () => {
    const balance = computeDealBalance(100_000, [
      { amount_usd: 40_000, status: 'confirmed' },
      { amount_usd: 25_000, status: 'failed' },
      { amount_usd: 10_000, status: 'pending' },
    ])
    expect(balance.paidUsd).toBe(40_000)
    expect(balance.pendingUsd).toBe(10_000)
    expect(balance.availableToPayOutUsd).toBe(50_000)
  })
})
