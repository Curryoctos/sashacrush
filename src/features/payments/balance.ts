export interface PaymentAmountRow {
  amount_usd: number
  status: string
}

export interface DealBalance {
  totalValueUsd: number
  paidUsd: number
  pendingUsd: number
  outstandingUsd: number
}

export function computeDealBalance(
  totalValueUsd: number,
  payments: PaymentAmountRow[],
): DealBalance {
  const paidUsd = payments
    .filter((payment) => payment.status === 'confirmed')
    .reduce((sum, payment) => sum + Number(payment.amount_usd), 0)

  const pendingUsd = payments
    .filter((payment) => payment.status !== 'confirmed')
    .reduce((sum, payment) => sum + Number(payment.amount_usd), 0)

  const outstandingUsd = Math.max(0, Number(totalValueUsd) - paidUsd)

  return {
    totalValueUsd: Number(totalValueUsd),
    paidUsd,
    pendingUsd,
    outstandingUsd,
  }
}
