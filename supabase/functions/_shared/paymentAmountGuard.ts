/**
 * Shared helpers for verifying gateway-paid amounts before confirming.
 */

const USD_CENT_TOLERANCE = 1

export function expectedStripeAmountCents(amountUsd: number): number {
  return Math.round(Number(amountUsd) * 100)
}

export function stripeAmountMatches(
  paidCents: number | null | undefined,
  expectedUsd: number,
  currency?: string | null,
): boolean {
  if (paidCents == null || !Number.isFinite(paidCents)) {
    return false
  }

  if (currency && currency.toLowerCase() !== 'usd') {
    return false
  }

  const expected = expectedStripeAmountCents(expectedUsd)
  return Math.abs(paidCents - expected) <= USD_CENT_TOLERANCE
}

export function flutterwaveAmountMatches(params: {
  paidAmount: number | null | undefined
  paidCurrency: string | null | undefined
  expectedUsd: number
  expectedUgx: number | null
}): boolean {
  const { paidAmount, paidCurrency, expectedUsd, expectedUgx } = params
  if (paidAmount == null || !Number.isFinite(paidAmount) || !paidCurrency) {
    return false
  }

  const currency = paidCurrency.toUpperCase()

  if (currency === 'UGX') {
    if (expectedUgx == null || !Number.isFinite(expectedUgx)) {
      return false
    }
    // UGX has no fractional subunit in our model — allow 1 UGX rounding
    return Math.abs(Number(paidAmount) - Number(expectedUgx)) <= 1
  }

  if (currency === 'USD') {
    return Math.abs(Number(paidAmount) - Number(expectedUsd)) <= 0.01
  }

  return false
}
