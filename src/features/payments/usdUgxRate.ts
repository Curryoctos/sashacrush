const RATE_CACHE_MS = 5 * 60 * 1000
let cachedUsdUgx: { rate: number; fetchedAt: number } | null = null

/** Live USD→UGX rate with short cache; falls back to last known or 3700. */
export async function fetchUsdToUgxRate(): Promise<number> {
  if (cachedUsdUgx && Date.now() - cachedUsdUgx.fetchedAt < RATE_CACHE_MS) {
    return cachedUsdUgx.rate
  }

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) {
      throw new Error(`Rate API ${response.status}`)
    }
    const json = (await response.json()) as { rates?: { UGX?: number } }
    const rate = json.rates?.UGX
    if (typeof rate !== 'number' || !Number.isFinite(rate)) {
      throw new Error('UGX rate missing')
    }
    cachedUsdUgx = { rate, fetchedAt: Date.now() }
    return rate
  } catch {
    return cachedUsdUgx?.rate ?? 3700
  }
}
