import { useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { InvestmentAccessGate } from '@/features/investments/components/InvestmentAccessGate'
import { InvestmentList } from '@/features/investments/components/InvestmentList'
import { InvestmentSubmitForm } from '@/features/investments/components/InvestmentSubmitForm'
import { useInvestmentAccessGate } from '@/features/investments/useInvestmentAccessGate'
import {
  useInvestableDeals,
  useMyInvestments,
  type InvestmentWithMeta,
} from '@/features/investments/useInvestments'
import { notifyInfo, notifySuccess } from '@/features/notifications/useNotifications'
import { Button } from '@/components/ui/Button'
import { Card, Stat } from '@/components/ui/Card'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { formatUsd } from '@/lib/formatters'
import { formatSupabaseError } from '@/lib/supabase-errors'
import type { CreateInvestmentInput } from '@/features/investments/validation'

export function AgentInvestmentsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const gate = useInvestmentAccessGate()
  const stripeHandled = useRef<string | null>(null)
  const dealsQuery = useInvestableDeals()
  const {
    investments,
    confirmedTotalUsd,
    isLoading,
    error,
    createInvestment,
    isCreating,
    cancelStripeCheckout,
    refresh,
  } = useMyInvestments()

  useEffect(() => {
    const stripe = searchParams.get('stripe')
    const investmentId = searchParams.get('investment')
    if (!stripe) {
      return
    }

    const handleKey = `${stripe}:${investmentId ?? ''}`
    if (stripeHandled.current === handleKey) {
      return
    }
    stripeHandled.current = handleKey

    void (async () => {
      if (stripe === 'success') {
        notifySuccess(
          'Card payment submitted. Capital updates when Stripe confirms — usually within a few seconds.',
        )
        await refresh()
        window.setTimeout(() => {
          void refresh()
        }, 2500)
        window.setTimeout(() => {
          void refresh()
        }, 6000)
      } else if (stripe === 'cancel') {
        if (investmentId) {
          try {
            await cancelStripeCheckout(investmentId)
          } catch {
            // Best-effort cleanup
          }
        }
        notifyInfo('Stripe Checkout was cancelled. No funds were charged.')
        await refresh()
      }

      const next = new URLSearchParams(searchParams)
      next.delete('stripe')
      next.delete('investment')
      setSearchParams(next, { replace: true })
    })()
  }, [searchParams, setSearchParams, refresh, cancelStripeCheckout])

  const handleSubmit = async (input: CreateInvestmentInput) => {
    try {
      await createInvestment(input)
      if (input.method !== 'stripe') {
        notifySuccess('Investment submitted. Admin will confirm once funds arrive.')
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Could not submit investment.'
      notifyInfo(message)
      throw submitError instanceof Error ? submitError : new Error(message)
    }
  }

  const showSummary = gate.termsAccepted

  const byDeal = useMemo(() => {
    const map = new Map<
      string,
      { landId: string; title: string; confirmed: number; pending: number }
    >()
    for (const row of investments as InvestmentWithMeta[]) {
      const key = row.land_id
      const current = map.get(key) ?? {
        landId: key,
        title: row.land_title || 'Untitled deal',
        confirmed: 0,
        pending: 0,
      }
      if (row.status === 'confirmed') {
        current.confirmed += Number(row.amount_usd)
      } else if (row.status === 'pending') {
        current.pending += Number(row.amount_usd)
      }
      map.set(key, current)
    }
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title))
  }, [investments])

  return (
    <div className="ui-page max-w-4xl space-y-6">
      <div>
        <PageBackLink to="/agent/dashboard" label="Agent Dashboard" />
        <PageHeader
          className="mt-3"
          eyebrow="Capital"
          title="Investments"
          description={
            user?.email
              ? `Signed in as ${user.email}. Invest toward a deal — confirmed amounts fund the company capital pool.`
              : 'Invest toward a deal — confirmed amounts fund the company capital pool.'
          }
          actions={
            <Link to="/agent/agreements">
              <Button variant="secondary">Agreements</Button>
            </Link>
          }
        />
      </div>

      {showSummary ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Your confirmed investments" value={formatUsd(confirmedTotalUsd)} />
          <Stat
            label="Awaiting confirmation"
            value={String(investments.filter((row) => row.status === 'pending').length)}
            hint="In the capital pool once confirmed"
          />
        </div>
      ) : null}

      {showSummary && byDeal.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="ui-section-title">By deal</h2>
            <p className="ui-section-desc">
              Earmarked toward each project; all confirmed totals still sit in one capital pool.
            </p>
          </div>
          <div className="space-y-2">
            {byDeal.map((deal) => (
              <Card key={deal.landId} padding="sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{deal.title}</p>
                  <p className="text-sm text-muted">
                    {formatUsd(deal.confirmed)} confirmed
                    {deal.pending > 0 ? ` · ${formatUsd(deal.pending)} pending` : ''}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {error && showSummary ? (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      ) : null}

      <InvestmentAccessGate>
        <InvestmentSubmitForm
          deals={dealsQuery.data ?? []}
          dealsLoading={dealsQuery.isLoading}
          isSubmitting={isCreating}
          onSubmit={handleSubmit}
        />
      </InvestmentAccessGate>

      {showSummary ? (
        isLoading ? (
          <p className="text-sm text-muted">Loading investments…</p>
        ) : (
          <InvestmentList
            investments={investments}
            title="Your investments"
            description="Each row is toward a deal and feeds the company capital pool when confirmed."
            emptyTitle="No investments submitted yet."
            showDeal
            dealLabel={(row) => {
              const withMeta = investments.find((item) => item.id === row.id) as
                | InvestmentWithMeta
                | undefined
              return withMeta?.land_title ?? null
            }}
          />
        )
      ) : null}
    </div>
  )
}
