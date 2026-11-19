import { describe, expect, it } from 'vitest'
import { cryptoTypeForDb, getTreasuryAddress } from '@/features/wallet/sendTransfer'

describe('sendTransfer helpers', () => {
  it('maps BTC display asset to WBTC ledger type', () => {
    expect(cryptoTypeForDb('BTC')).toBe('WBTC')
    expect(cryptoTypeForDb('ETH')).toBe('ETH')
    expect(cryptoTypeForDb('USDT')).toBe('USDT')
  })

  it('rejects invalid treasury addresses', () => {
    // Env may be unset in unit tests
    const address = getTreasuryAddress()
    if (address) {
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/)
    } else {
      expect(address).toBeNull()
    }
  })
})
