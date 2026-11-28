export interface PaymentAmountRow {
  amount_usd: number
  status: string
}

export interface DealBalance {
  totalValueUsd: number
  /** Sum of confirmed payouts (plan BR-03 / C-11). */
  paidUsd: number
  /** Sum of in-flight payouts (pending / pending_manual). */
  pendingUsd: number
  /** Deal total minus confirmed paid. */
  outstandingUsd: number
  /** Room left for new payout amounts (outstanding minus pending). */
  availableToPayOutUsd: number
  /** @deprecated Prefer availableToPayOutUsd */
  availableToCollectUsd: number
}

function isPendingStatus(status: string): boolean {
  return status === 'pending' || status === 'pending_manual'
}

export function computeDealBalance(
  totalValueUsd: number,
  payments: PaymentAmountRow[],
): DealBalance {
  const paidUsd = payments
    .filter((payment) => payment.status === 'confirmed')
    .reduce((sum, payment) => sum + Number(payment.amount_usd), 0)

  const pendingUsd = payments
    .filter((payment) => isPendingStatus(payment.status))
    .reduce((sum, payment) => sum + Number(payment.amount_usd), 0)

  const outstandingUsd = Math.max(0, Number(totalValueUsd) - paidUsd)
  const availableToPayOutUsd = Math.max(0, outstandingUsd - pendingUsd)

  return {
    totalValueUsd: Number(totalValueUsd),
    paidUsd,
    pendingUsd,
    outstandingUsd,
    availableToPayOutUsd,
    availableToCollectUsd: availableToPayOutUsd,
  }
}
