export interface CapitalAmountRow {
  amount_usd: number
  status: string
}

export interface CompanyCapital {
  /** Sum of confirmed executive investments. */
  raisedUsd: number
  /** Sum of pending executive investments awaiting admin confirmation. */
  pendingCapitalUsd: number
  /** Sum of confirmed seller disbursements (payments). */
  disbursedUsd: number
  /** raisedUsd − disbursedUsd (clamped at 0). */
  availableUsd: number
}

export function computeCompanyCapital(
  investments: CapitalAmountRow[],
  disbursements: CapitalAmountRow[],
): CompanyCapital {
  const raisedUsd = investments
    .filter((row) => row.status === 'confirmed')
    .reduce((sum, row) => sum + Number(row.amount_usd), 0)

  const pendingCapitalUsd = investments
    .filter((row) => row.status === 'pending')
    .reduce((sum, row) => sum + Number(row.amount_usd), 0)

  const disbursedUsd = disbursements
    .filter((row) => row.status === 'confirmed')
    .reduce((sum, row) => sum + Number(row.amount_usd), 0)

  return {
    raisedUsd,
    pendingCapitalUsd,
    disbursedUsd,
    availableUsd: Math.max(0, raisedUsd - disbursedUsd),
  }
}

/** Soft warning when a new payout would exceed company capital available. */
export function capitalShortfallWarning(
  availableUsd: number,
  payoutAmountUsd: number,
): string | null {
  if (!Number.isFinite(payoutAmountUsd) || payoutAmountUsd <= 0) {
    return null
  }
  if (!Number.isFinite(availableUsd) || payoutAmountUsd <= availableUsd) {
    return null
  }
  const shortfall = payoutAmountUsd - availableUsd
  return `This payout exceeds company capital available by $${shortfall.toFixed(2)}. You can still proceed.`
}
