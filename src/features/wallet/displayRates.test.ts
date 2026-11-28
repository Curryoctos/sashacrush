import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchFreshTransactionRates } from '@/features/wallet/displayRates'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchFreshTransactionRates', () => {
  it('returns live crypto + UGX rates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('coingecko')) {
          return new Response(
            JSON.stringify({
              bitcoin: { usd: 90000 },
              ethereum: { usd: 3500 },
              tether: { usd: 1 },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        }
        if (url.includes('er-api.com')) {
          return new Response(JSON.stringify({ rates: { UGX: 3700 } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response('not found', { status: 404 })
      }),
    )

    const rates = await fetchFreshTransactionRates()
    expect(rates.cryptoUsd.ETH).toBe(3500)
    expect(rates.usdToUgx).toBe(3700)
    expect(rates.fetchedAt).toBeGreaterThan(0)
  })

  it('throws instead of returning stale rates when APIs fail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('down', { status: 503 })),
    )

    await expect(fetchFreshTransactionRates()).rejects.toThrow(
      /Live rate unavailable/,
    )
  })
})
