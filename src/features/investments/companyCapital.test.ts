import { describe, expect, it } from 'vitest'
import {
  capitalShortfallWarning,
  computeCompanyCapital,
} from '@/features/investments/companyCapital'

describe('computeCompanyCapital', () => {
  it('computes raised, pending, disbursed, and available', () => {
    expect(
      computeCompanyCapital(
        [
          { amount_usd: 50_000, status: 'confirmed' },
          { amount_usd: 10_000, status: 'pending' },
          { amount_usd: 5_000, status: 'rejected' },
        ],
        [
          { amount_usd: 20_000, status: 'confirmed' },
          { amount_usd: 8_000, status: 'pending' },
          { amount_usd: 3_000, status: 'failed' },
        ],
      ),
    ).toEqual({
      raisedUsd: 50_000,
      pendingCapitalUsd: 10_000,
      disbursedUsd: 20_000,
      availableUsd: 30_000,
    })
  })

  it('treats empty inputs as zero capital', () => {
    expect(computeCompanyCapital([], [])).toEqual({
      raisedUsd: 0,
      pendingCapitalUsd: 0,
      disbursedUsd: 0,
      availableUsd: 0,
    })
  })

  it('clamps available when disbursed exceeds raised', () => {
    const capital = computeCompanyCapital(
      [{ amount_usd: 10_000, status: 'confirmed' }],
      [{ amount_usd: 25_000, status: 'confirmed' }],
    )
    expect(capital.availableUsd).toBe(0)
  })
})

describe('capitalShortfallWarning', () => {
  it('returns null when payout fits available capital', () => {
    expect(capitalShortfallWarning(40_000, 10_000)).toBeNull()
    expect(capitalShortfallWarning(10_000, 10_000)).toBeNull()
  })

  it('warns when payout exceeds available', () => {
    expect(capitalShortfallWarning(5_000, 12_000)).toContain('$7000.00')
  })

  it('ignores non-positive payout amounts', () => {
    expect(capitalShortfallWarning(0, 0)).toBeNull()
    expect(capitalShortfallWarning(100, -5)).toBeNull()
  })
})
