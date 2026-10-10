import { computePaymentProgress } from '@/lib/formatters'

export const PAYMENT_DELAY_DAYS = 30

export interface AnalyticsDealRow {
  land_id: string
  title: string
  status: string
  total_value_usd: number
  paid_usd: number
  pending_usd: number
  last_payment_at: string | null
  created_at: string
  photo_count: number
}

export interface AnalyticsMonthlyPayment {
  month: string
  paid_usd: number
  payment_count: number
}

export interface AnalyticsMonthlyPhotos {
  month: string
  photo_count: number
}

export interface AnalyticsDocumentCounts {
  draft: number
  sent: number
  signed: number
  archived: number
}

export interface AnalyticsSnapshot {
  deals: AnalyticsDealRow[]
  payments_monthly: AnalyticsMonthlyPayment[]
  photos_monthly: AnalyticsMonthlyPhotos[]
  documents: AnalyticsDocumentCounts
}

export interface DealProgressRow {
  landId: string
  title: string
  status: string
  totalValueUsd: number
  paidUsd: number
  pendingUsd: number
  outstandingUsd: number
  pctPaid: number
  photoCount: number
  lastPaymentAt: string | null
  delayed: boolean
}

export function isPaymentDelayed(
  deal: Pick<AnalyticsDealRow, 'last_payment_at' | 'created_at' | 'total_value_usd' | 'paid_usd'>,
  now: Date = new Date(),
  delayDays: number = PAYMENT_DELAY_DAYS,
): boolean {
  const { outstandingUsd } = computePaymentProgress(deal.total_value_usd, deal.paid_usd)
  if (outstandingUsd <= 0) {
    return false
  }
  const anchor = deal.last_payment_at ?? deal.created_at
  const anchorMs = Date.parse(anchor)
  if (!Number.isFinite(anchorMs)) {
    return false
  }
  const ageDays = (now.getTime() - anchorMs) / (1000 * 60 * 60 * 24)
  return ageDays >= delayDays
}

export function buildDealProgress(
  deals: AnalyticsDealRow[],
  now: Date = new Date(),
): DealProgressRow[] {
  return deals.map((deal) => {
    const { outstandingUsd, pctPaid } = computePaymentProgress(
      deal.total_value_usd,
      deal.paid_usd,
    )
    return {
      landId: deal.land_id,
      title: deal.title,
      status: deal.status,
      totalValueUsd: Number(deal.total_value_usd),
      paidUsd: Number(deal.paid_usd),
      pendingUsd: Number(deal.pending_usd),
      outstandingUsd,
      pctPaid,
      photoCount: Number(deal.photo_count),
      lastPaymentAt: deal.last_payment_at,
      delayed: isPaymentDelayed(deal, now),
    }
  })
}

export function documentStatusChartData(documents: AnalyticsDocumentCounts) {
  return [
    { status: 'Draft', count: documents.draft },
    { status: 'Sent', count: documents.sent },
    { status: 'Signed', count: documents.signed },
    { status: 'Archived', count: documents.archived },
  ]
}

/** Fill missing months in a 12-month window so charts stay stable. */
export function fillMonthlySeries<T extends { month: string }>(
  rows: T[],
  empty: (month: string) => T,
  now: Date = new Date(),
): T[] {
  const byMonth = new Map(rows.map((row) => [row.month, row]))
  const result: T[] = []
  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    result.push(byMonth.get(month) ?? empty(month))
  }
  return result
}
