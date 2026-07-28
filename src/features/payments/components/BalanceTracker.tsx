import { useCallback, useEffect, useState } from 'react'
import { computeDealBalance } from '@/features/payments/balance'
import { exportToCsv, type PaymentRow } from '@/features/payments/exportCsv'
import { fetchUsdToUgxRate } from '@/features/payments/usdUgxRate'
import { useAuth } from '@/hooks/useAuth'
import {
  computePaymentProgress,
  formatDate,
  formatPct,
  formatUgx,
  formatUsd,
} from '@/lib/formatters'
import { supabase } from '@/lib/supabase'

export type { PaymentRow }

interface BalanceTrackerProps {
  landId: string
  landTitle: string
  landReference?: string
  totalValueUsd: number
}

interface BalanceSummary {
  totalValueUsd: number
  totalValueUgx: number
  paidUsd: number
  paidUgx: number
  outstandingUsd: number
  outstandingUgx: number
  pctPaid: number
  lastPaymentDate: string | null
  payments: PaymentRow[]
}

export function BalanceTracker({
  landId,
  landTitle,
  landReference = 'SC-MBD-001',
  totalValueUsd,
}: BalanceTrackerProps) {
  const { user } = useAuth()
  const [summary, setSummary] = useState<BalanceSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [{ data: payments, error: paymentsError }, ugxRate] = await Promise.all([
        supabase
          .from('payments')
          .select('id, land_id, amount_usd, amount_ugx, rate_used, method, status, created_at')
          .eq('land_id', landId)
          .order('created_at', { ascending: false }),
        fetchUsdToUgxRate(),
      ])

      if (paymentsError) {
        throw paymentsError
      }

      const paymentIds = (payments ?? [])
        .filter((p) => p.status === 'confirmed')
        .map((p) => p.id)

      const { data: receipts } = paymentIds.length
        ? await supabase
            .from('receipts')
            .select('payment_id, receipt_number, pdf_path, created_at')
            .in('payment_id', paymentIds)
        : { data: [] as Array<{
            payment_id: string
            receipt_number: string
            pdf_path: string | null
            created_at: string
          }> }

      const receiptByPayment = new Map(
        (receipts ?? []).map((r) => [r.payment_id, r]),
      )

      const rows: PaymentRow[] = (payments ?? []).map((p) => {
        const receipt = receiptByPayment.get(p.id)
        return {
          id: p.id,
          receipt_number: receipt?.receipt_number ?? null,
          confirmed_at: receipt?.created_at ?? null,
          amount_usd: Number(p.amount_usd),
          amount_ugx: p.amount_ugx != null ? Number(p.amount_ugx) : null,
          rate_used: p.rate_used != null ? Number(p.rate_used) : null,
          method: p.method,
          status: p.status,
          pdf_path: receipt?.pdf_path ?? null,
          created_at: p.created_at,
        }
      })

      const balance = computeDealBalance(totalValueUsd, rows)
      const { outstandingUsd, pctPaid } = computePaymentProgress(
        balance.totalValueUsd,
        balance.paidUsd,
      )

      const confirmed = rows.filter((r) => r.status === 'confirmed')
      const paidUgx = confirmed.reduce((sum, r) => {
        if (r.amount_ugx != null) {
          return sum + r.amount_ugx
        }
        if (r.rate_used != null) {
          return sum + r.amount_usd * r.rate_used
        }
        return sum + r.amount_usd * ugxRate
      }, 0)

      const lastPaymentDate =
        confirmed
          .map((r) => r.confirmed_at ?? r.created_at)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null

      setSummary({
        totalValueUsd: balance.totalValueUsd,
        totalValueUgx: balance.totalValueUsd * ugxRate,
        paidUsd: balance.paidUsd,
        paidUgx,
        outstandingUsd,
        outstandingUgx: outstandingUsd * ugxRate,
        pctPaid,
        lastPaymentDate,
        payments: confirmed,
      })
    } catch (loadError) {
      setError('Could not load payment data. Please refresh.')
      console.error(loadError)
    } finally {
      setIsLoading(false)
    }
  }, [landId, totalValueUsd])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const channel = supabase
      .channel(`balance-tracker:${landId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `land_id=eq.${landId}`,
        },
        () => {
          void load()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [landId, load])

  if (user?.role === 'seller') {
    return null
  }

  if (isLoading) {
    return (
      <div className="ui-panel p-6" aria-busy="true">
        <div className="ui-skeleton h-4 w-48" />
        <div className="ui-skeleton mt-4 h-6 w-full" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="ui-skeleton h-20" />
          <div className="ui-skeleton h-20" />
          <div className="ui-skeleton h-20" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ui-alert-danger">
        {error}
      </div>
    )
  }

  if (!summary) {
    return null
  }

  const empty = summary.payments.length === 0

  return (
    <section className="ui-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            {landTitle} — {landReference}
          </h2>
          <p className="mt-1 text-sm text-muted">Payment Progress</p>
        </div>
        {!empty && (
          <button
            type="button"
            onClick={() =>
              exportToCsv(
                summary.payments,
                `${landReference.toLowerCase()}-payments.csv`,
              )
            }
            className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface"
          >
            ↓ Export CSV
          </button>
        )}
      </div>

      {empty ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface px-4 py-6 text-sm text-muted">
          No payments confirmed yet. {formatUsd(summary.outstandingUsd)} outstanding.
        </p>
      ) : (
        <>
          <div className="mt-5">
            <div className="relative h-4 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-brand-700 transition-[width]"
                style={{ width: `${Math.min(100, summary.pctPaid)}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-medium text-ink">
              {formatPct(summary.pctPaid)} paid
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <BalanceStat
              label="Total Value"
              usd={formatUsd(summary.totalValueUsd)}
              ugx={formatUgx(summary.totalValueUgx)}
            />
            <BalanceStat
              label="Amount Paid"
              usd={formatUsd(summary.paidUsd)}
              ugx={formatUgx(summary.paidUgx)}
            />
            <BalanceStat
              label="Outstanding"
              usd={formatUsd(summary.outstandingUsd)}
              ugx={formatUgx(summary.outstandingUgx)}
              emphasize
            />
          </div>

          {summary.lastPaymentDate && (
            <p className="mt-4 text-sm text-muted">
              Last Payment: {formatDate(summary.lastPaymentDate)}
            </p>
          )}
        </>
      )}
    </section>
  )
}

function BalanceStat({
  label,
  usd,
  ugx,
  emphasize = false,
}: {
  label: string
  usd: string
  ugx: string
  emphasize?: boolean
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        emphasize ? 'border-brand-200 bg-brand-50' : 'border-border bg-surface'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-ink">{usd}</p>
      <p className="mt-0.5 text-xs text-muted">{ugx}</p>
    </div>
  )
}
