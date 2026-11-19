import { describe, expect, it } from 'vitest'
import { usdValueForHolding } from '@/features/wallet/displayRates'
import { shortenAddress } from '@/features/wallet/constants'

describe('wallet helpers', () => {
  it('shortens addresses for display', () => {
    expect(shortenAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(
      '0x1234…5678',
    )
  })

  it('values holdings in USD', () => {
    expect(
      usdValueForHolding('ETH', 2, { BTC: 100_000, ETH: 3_000, USDT: 1 }),
    ).toBe(6_000)
    expect(
      usdValueForHolding('USDT', 50, { BTC: 100_000, ETH: 3_000, USDT: 1 }),
    ).toBe(50)
  })
})
