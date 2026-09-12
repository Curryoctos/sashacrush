import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { InvestmentList } from '@/features/investments/components/InvestmentList'
import { InvestmentSubmitForm } from '@/features/investments/components/InvestmentSubmitForm'
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
  const {
    investments,
    confirmedTotalUsd,
    isLoading,
    error,
    createInvestment,
    isCreating,
    refresh,
  } = useMyInvestments()

  useEffect(() => {
    const stripe = searchParams.get('stripe')
    if (!stripe) {
      return
    }

    if (stripe === 'success') {
      notifySuccess(
        'Card payment submitted. Capital updates when Stripe confirms — usually within a few seconds.',
      )
      void refresh()
    } else if (stripe === 'cancel') {
      notifyInfo('Stripe Checkout was cancelled. No funds were charged.')
    }

    const next = new URLSearchParams(searchParams)
    next.delete('stripe')
    next.delete('investment')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, refresh])

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

  return (
    <div className="ui-page max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Capital"
        title="Investments"
        description={
          user?.email
            ? `Signed in as ${user.email}. Contribute to the company capital pool.`
            : 'Contribute to the company capital pool.'
        }
        actions={
          <Link to="/executive/dashboard">
            <Button variant="secondary">Dashboard</Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Your confirmed capital" value={formatUsd(confirmedTotalUsd)} />
        <Stat
          label="Awaiting confirmation"
          value={String(investments.filter((row) => row.status === 'pending').length)}
          hint="Card or offline contributions still pending"
        />
      </div>

      {error && (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      )}

      <InvestmentSubmitForm isSubmitting={isCreating} onSubmit={handleSubmit} />

      {isLoading ? (
        <p className="text-sm text-muted">Loading investments…</p>
      ) : (
        <InvestmentList
          investments={investments}
          title="Your investments"
          description="Company-wide capital contributions. Deals are funded when the company disburses."
          emptyTitle="No investments submitted yet."
        />
      )}
    </div>
  )
}
