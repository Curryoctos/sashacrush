import type { CryptoAsset } from '@/features/wallet/constants'

/** Display-only rates — 1-minute cache. Never use for locking a payment rate (C-09). */
const DISPLAY_CACHE_MS = 60_000

export interface CryptoUsdRates {
  BTC: number
  ETH: number
  USDT: number
}

export interface WalletDisplayRates {
  cryptoUsd: CryptoUsdRates
  usdToUgx: number
  fetchedAt: number
  /** True when we could not refresh and are showing last-known or empty. */
  stale: boolean
  error: string | null
}

const EMPTY_CRYPTO: CryptoUsdRates = { BTC: 0, ETH: 0, USDT: 0 }

let cache: WalletDisplayRates | null = null

async function fetchCryptoUsdRates(): Promise<CryptoUsdRates> {
  const url =
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd'
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!response.ok) {
    throw new Error(`CoinGecko ${response.status}`)
  }
  const json = (await response.json()) as {
    bitcoin?: { usd?: number }
    ethereum?: { usd?: number }
    tether?: { usd?: number }
  }
  const BTC = json.bitcoin?.usd
  const ETH = json.ethereum?.usd
  const USDT = json.tether?.usd
  if (
    typeof BTC !== 'number' ||
    typeof ETH !== 'number' ||
    typeof USDT !== 'number' ||
    !Number.isFinite(BTC) ||
    !Number.isFinite(ETH) ||
    !Number.isFinite(USDT)
  ) {
    throw new Error('CoinGecko rates incomplete')
  }
  return { BTC, ETH, USDT }
}

async function fetchUsdToUgxLive(): Promise<number> {
  const response = await fetch('https://open.er-api.com/v6/latest/USD', {
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) {
    throw new Error(`FX API ${response.status}`)
  }
  const json = (await response.json()) as { rates?: { UGX?: number } }
  const rate = json.rates?.UGX
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    throw new Error('UGX rate missing')
  }
  return rate
}

export async function fetchWalletDisplayRates(options?: {
  force?: boolean
}): Promise<WalletDisplayRates> {
  if (
    !options?.force &&
    cache &&
    !cache.stale &&
    Date.now() - cache.fetchedAt < DISPLAY_CACHE_MS
  ) {
    return cache
  }

  try {
    const [cryptoUsd, usdToUgx] = await Promise.all([
      fetchCryptoUsdRates(),
      fetchUsdToUgxLive(),
    ])
    cache = {
      cryptoUsd,
      usdToUgx,
      fetchedAt: Date.now(),
      stale: false,
      error: null,
    }
    return cache
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Live rates unavailable'
    if (cache) {
      cache = { ...cache, stale: true, error: message }
      return cache
    }
    cache = {
      cryptoUsd: EMPTY_CRYPTO,
      usdToUgx: 0,
      fetchedAt: Date.now(),
      stale: true,
      error: message,
    }
    return cache
  }
}

export function usdValueForHolding(
  asset: CryptoAsset,
  balance: number,
  rates: CryptoUsdRates,
): number {
  const price = rates[asset]
  if (!Number.isFinite(balance) || !Number.isFinite(price)) {
    return 0
  }
  return balance * price
}

export function formatRateTimestamp(fetchedAt: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(fetchedAt))
}
