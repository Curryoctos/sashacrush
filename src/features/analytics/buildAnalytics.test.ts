import { describe, expect, it } from 'vitest'
import {
  buildDealProgress,
  fillMonthlySeries,
  isPaymentDelayed,
  type AnalyticsDealRow,
} from '@/features/analytics/buildAnalytics'

const baseDeal: AnalyticsDealRow = {
  land_id: 'land-1',
  title: 'Mubende North',
  status: 'active',
  total_value_usd: 100_000,
  paid_usd: 10_000,
  pending_usd: 0,
  last_payment_at: '2026-08-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  photo_count: 3,
}

describe('isPaymentDelayed', () => {
  it('flags deals with outstanding balance and no activity for 30+ days', () => {
    const now = new Date('2026-09-22T00:00:00.000Z')
    expect(isPaymentDelayed(baseDeal, now)).toBe(true)
  })

  it('does not flag fully paid deals', () => {
    const now = new Date('2026-09-22T00:00:00.000Z')
    expect(
      isPaymentDelayed({ ...baseDeal, paid_usd: 100_000, last_payment_at: '2026-01-01T00:00:00.000Z' }, now),
    ).toBe(false)
  })

  it('uses created_at when there are no payments yet', () => {
    const now = new Date('2026-09-22T00:00:00.000Z')
    expect(
      isPaymentDelayed(
        {
          ...baseDeal,
          paid_usd: 0,
          last_payment_at: null,
          created_at: '2026-09-20T00:00:00.000Z',
        },
        now,
      ),
    ).toBe(false)
  })
})

describe('buildDealProgress', () => {
  it('computes pct paid and delay flag', () => {
    const now = new Date('2026-09-22T00:00:00.000Z')
    const [row] = buildDealProgress([baseDeal], now)
    expect(row?.pctPaid).toBe(10)
    expect(row?.outstandingUsd).toBe(90_000)
    expect(row?.delayed).toBe(true)
  })
})

describe('fillMonthlySeries', () => {
  it('pads a 12-month window', () => {
    const now = new Date('2026-09-15T00:00:00.000Z')
    const filled = fillMonthlySeries(
      [{ month: '2026-09', paid_usd: 500, payment_count: 1 }],
      (month) => ({ month, paid_usd: 0, payment_count: 0 }),
      now,
    )
    expect(filled).toHaveLength(12)
    expect(filled[0]?.month).toBe('2025-10')
    expect(filled[11]?.month).toBe('2026-09')
    expect(filled[11]?.paid_usd).toBe(500)
  })
})
