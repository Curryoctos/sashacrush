import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { InvestmentAccessGate } from '@/features/investments/components/InvestmentAccessGate'
import { InvestmentList } from '@/features/investments/components/InvestmentList'
import { InvestmentSubmitForm } from '@/features/investments/components/InvestmentSubmitForm'
import { useInvestmentAccessGate } from '@/features/investments/useInvestmentAccessGate'
import { useMyInvestments } from '@/features/investments/useInvestments'
import { notifyInfo, notifySuccess } from '@/features/notifications/useNotifications'
import { Button } from '@/components/ui/Button'
import { Stat } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { formatUsd } from '@/lib/formatters'
import { formatSupabaseError } from '@/lib/supabase-errors'
import type { CreateInvestmentInput } from '@/features/investments/validation'

export function ExecutiveInvestmentsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const gate = useInvestmentAccessGate()
  const stripeHandled = useRef<string | null>(null)
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
            // Best-effort cleanup; still clear the URL banner.
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
        submitError instanceof Error
          ? submitError.message
          : 'Could not submit investment.'
      notifyInfo(message)
      throw submitError instanceof Error ? submitError : new Error(message)
    }
  }

  // After terms are accepted, show capital history even if agreements are still pending.
  const showCapitalSummary = gate.termsAccepted

  return (
    <div className="ui-page max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Capital"
        title="Investments"
        description={
          user?.email
            ? showCapitalSummary
              ? `Signed in as ${user.email}. Contribute to the company capital pool.`
              : `Signed in as ${user.email}. Complete the steps below to open the contribution portal.`
            : showCapitalSummary
              ? 'Contribute to the company capital pool.'
              : 'Complete the steps below to open the contribution portal.'
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/executive/documents">
              <Button variant="secondary">Agreements</Button>
            </Link>
            <Link to="/executive/dashboard">
              <Button variant="secondary">Dashboard</Button>
            </Link>
          </div>
        }
      />

      {showCapitalSummary ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Your confirmed capital" value={formatUsd(confirmedTotalUsd)} />
          <Stat
            label="Awaiting confirmation"
            value={String(investments.filter((row) => row.status === 'pending').length)}
            hint="Card or offline contributions still pending"
          />
        </div>
      ) : null}

      {error && showCapitalSummary ? (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      ) : null}

      <InvestmentAccessGate>
        <InvestmentSubmitForm isSubmitting={isCreating} onSubmit={handleSubmit} />
      </InvestmentAccessGate>

      {showCapitalSummary ? (
        isLoading ? (
          <p className="text-sm text-muted">Loading investments…</p>
        ) : (
          <InvestmentList
            investments={investments}
            title="Your investments"
            description="Company-wide capital contributions. Deals are funded when the company disburses."
            emptyTitle="No investments submitted yet."
          />
        )
      ) : null}
    </div>
  )
}
