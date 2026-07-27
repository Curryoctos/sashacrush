export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatUgx(amount: number): string {
  return `${new Intl.NumberFormat('en-UG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))} UGX`
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(iso))
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`
}

export function computePaymentProgress(
  totalValueUsd: number,
  paidUsd: number,
): { outstandingUsd: number; pctPaid: number } {
  const total = Number(totalValueUsd)
  const paid = Number(paidUsd)
  const outstandingUsd = Math.max(0, total - paid)
  const pctPaid = total > 0 ? Math.round((paid / total) * 10000) / 100 : 0
  return { outstandingUsd, pctPaid }
}
