import { describe, expect, it } from 'vitest'
import { computeDealBalance } from '@/features/payments/balance'

describe('computeDealBalance', () => {
  it('computes paid, pending, and outstanding against deal total', () => {
    const balance = computeDealBalance(100_000, [
      { amount_usd: 40_000, status: 'confirmed' },
      { amount_usd: 10_000, status: 'pending' },
      { amount_usd: 5_000, status: 'pending' },
    ])

    expect(balance).toEqual({
      totalValueUsd: 100_000,
      paidUsd: 40_000,
      pendingUsd: 15_000,
      outstandingUsd: 60_000,
    })
  })

  it('never reports negative outstanding', () => {
    const balance = computeDealBalance(50_000, [
      { amount_usd: 60_000, status: 'confirmed' },
    ])

    expect(balance.outstandingUsd).toBe(0)
    expect(balance.paidUsd).toBe(60_000)
  })
})
