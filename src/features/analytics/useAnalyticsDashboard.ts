import { useQuery } from '@tanstack/react-query'
import {
  buildDealProgress,
  documentStatusChartData,
  fillMonthlySeries,
  type AnalyticsSnapshot,
  type DealProgressRow,
} from '@/features/analytics/buildAnalytics'
import { supabase } from '@/lib/supabase'

export interface AnalyticsDashboardData {
  deals: DealProgressRow[]
  delayedDeals: DealProgressRow[]
  paymentsMonthly: Array<{ month: string; paid_usd: number; payment_count: number }>
  photosMonthly: Array<{ month: string; photo_count: number }>
  documents: Array<{ status: string; count: number }>
  totals: {
    dealCount: number
    paidUsd: number
    outstandingUsd: number
    delayedCount: number
  }
}

function parseSnapshot(raw: unknown): AnalyticsSnapshot {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Analytics snapshot was empty.')
  }
  const data = raw as Partial<AnalyticsSnapshot>
  return {
    deals: Array.isArray(data.deals) ? data.deals : [],
    payments_monthly: Array.isArray(data.payments_monthly) ? data.payments_monthly : [],
    photos_monthly: Array.isArray(data.photos_monthly) ? data.photos_monthly : [],
    documents: {
      draft: Number(data.documents?.draft ?? 0),
      sent: Number(data.documents?.sent ?? 0),
      signed: Number(data.documents?.signed ?? 0),
      archived: Number(data.documents?.archived ?? 0),
    },
  }
}

export function useAnalyticsDashboard() {
  return useQuery({
    queryKey: ['analytics-portfolio'],
    refetchInterval: 5_000,
    queryFn: async (): Promise<AnalyticsDashboardData> => {
      const { data, error } = await supabase.rpc('analytics_portfolio_snapshot')
      if (error) {
        throw error
      }
      const snapshot = parseSnapshot(data)
      const deals = buildDealProgress(snapshot.deals)
      const delayedDeals = deals.filter((deal) => deal.delayed)
      const paymentsMonthly = fillMonthlySeries(snapshot.payments_monthly, (month) => ({
        month,
        paid_usd: 0,
        payment_count: 0,
      }))
      const photosMonthly = fillMonthlySeries(snapshot.photos_monthly, (month) => ({
        month,
        photo_count: 0,
      }))

      return {
        deals,
        delayedDeals,
        paymentsMonthly,
        photosMonthly,
        documents: documentStatusChartData(snapshot.documents),
        totals: {
          dealCount: deals.length,
          paidUsd: deals.reduce((sum, deal) => sum + deal.paidUsd, 0),
          outstandingUsd: deals.reduce((sum, deal) => sum + deal.outstandingUsd, 0),
          delayedCount: delayedDeals.length,
        },
      }
    },
  })
}
