import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, Stat } from '@/components/ui/Card'
import { EmptyState, PageHeader } from '@/components/ui/PageHeader'
import { InvestmentList } from '@/features/investments/components/InvestmentList'
import {
  useAdminInvestments,
  useCompanyCapital,
} from '@/features/investments/useInvestments'
import { investmentMethodLabel } from '@/features/investments/validation'
import { notifyInfo, notifySuccess } from '@/features/notifications/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatUsd } from '@/lib/formatters'
import { formatSupabaseError } from '@/lib/supabase-errors'
import type { InvestmentStatus } from '@/types/database'

type StatusFilter = InvestmentStatus | 'all'

export function AdminCapitalPage() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const { capital, isLoading: capitalLoading, error: capitalError } = useCompanyCapital()
  const {
    investments,
    pending,
    allInvestments,
    isLoading,
    error,
    confirmInvestment,
    rejectInvestment,
  } = useAdminInvestments(statusFilter)

  const pendingCount = pending.length

  const filterOptions = useMemo(
    () =>
      [
        { id: 'all' as const, label: 'All', count: allInvestments.length },
        { id: 'pending' as const, label: 'Pending', count: pendingCount },
        {
          id: 'confirmed' as const,
          label: 'Confirmed',
          count: allInvestments.filter((row) => row.status === 'confirmed').length,
        },
        {
          id: 'rejected' as const,
          label: 'Rejected',
          count: allInvestments.filter((row) => row.status === 'rejected').length,
        },
      ] as const,
    [allInvestments, pendingCount],
  )

  const handleConfirm = async (investmentId: string) => {
    setActionError(null)
    setConfirmingId(investmentId)
    try {
      await confirmInvestment(investmentId)
      notifySuccess('Investment confirmed and added to company capital.')
    } catch (confirmError) {
      const message =
        confirmError instanceof Error
          ? confirmError.message
          : 'Could not confirm investment.'
      setActionError(message)
      notifyInfo(message)
    } finally {
      setConfirmingId(null)
    }
  }

  const handleReject = async (investmentId: string) => {
    setActionError(null)
    setRejectingId(investmentId)
    try {
      await rejectInvestment({
        investmentId,
        reason: rejectReason.trim() || null,
      })
      notifySuccess('Investment rejected.')
      setRejectReason('')
    } catch (rejectError) {
      const message =
        rejectError instanceof Error ? rejectError.message : 'Could not reject investment.'
      setActionError(message)
      notifyInfo(message)
    } finally {
      setRejectingId(null)
    }
  }

  return (
    <div className="ui-page max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Treasury"
        title="Company capital"
        description={
          user?.email
            ? `Signed in as ${user.email}. Confirm executive contributions into the company pool.`
            : 'Confirm executive contributions into the company pool.'
        }
        actions={
          <Link to="/admin/payments">
            <Button variant="secondary">Seller payouts</Button>
          </Link>
        }
      />

      {(capitalLoading || capital) && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Raised"
            value={formatUsd(capital?.raisedUsd ?? 0)}
            hint="Confirmed investments"
          />
          <Stat
            label="Pending capital"
            value={formatUsd(capital?.pendingCapitalUsd ?? 0)}
            hint="Awaiting confirmation"
          />
          <Stat
            label="Disbursed"
            value={formatUsd(capital?.disbursedUsd ?? 0)}
            hint="Confirmed seller payouts"
          />
          <Stat
            label="Available"
            value={formatUsd(capital?.availableUsd ?? 0)}
            hint="Raised minus disbursed"
            emphasize
          />
        </div>
      )}

      {(error || capitalError || actionError) && (
        <p className="ui-alert-danger" role="alert">
          {actionError ??
            formatSupabaseError((error ?? capitalError) as Error)}
        </p>
      )}

      <Card>
        <CardHeader
          title="Pending confirmation"
          description="Match each reference against the company bank or MoMo account, then confirm."
        />
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : pending.length === 0 ? (
          <EmptyState title="No pending investments." />
        ) : (
          <div className="space-y-3">
            {pending.map((investment) => (
              <div
                key={investment.id}
                className="rounded-lg border border-border bg-surface px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-ink">
                      {formatUsd(Number(investment.amount_usd))} ·{' '}
                      {investmentMethodLabel(investment.method)}
                    </p>
                    <p className="text-sm text-muted">
                      {investment.executive_name || investment.executive_email || 'Executive'} ·{' '}
                      {formatDate(investment.created_at)}
                    </p>
                    <p className="font-mono text-xs text-ink">{investment.reference}</p>
                    {investment.notes ? (
                      <p className="text-xs text-muted">{investment.notes}</p>
                    ) : null}
                  </div>
                  <Badge tone={statusTone(investment.status)}>{investment.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    disabled={confirmingId === investment.id || rejectingId === investment.id}
                    onClick={() => void handleConfirm(investment.id)}
                  >
                    {confirmingId === investment.id ? 'Confirming…' : 'Confirm'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={confirmingId === investment.id || rejectingId === investment.id}
                    onClick={() => void handleReject(investment.id)}
                  >
                    {rejectingId === investment.id ? 'Rejecting…' : 'Reject'}
                  </Button>
                </div>
              </div>
            ))}
            <label className="block space-y-1.5 pt-1">
              <span className="ui-label">Rejection reason (optional)</span>
              <input
                className="ui-input"
                type="text"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Applied to the next reject action"
              />
            </label>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={
              statusFilter === option.id
                ? 'rounded-md bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800'
                : 'rounded-md bg-surface px-3 py-1.5 text-xs font-medium text-muted'
            }
            onClick={() => setStatusFilter(option.id)}
          >
            {option.label}
            {option.count > 0 ? ` (${option.count})` : ''}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading history…</p>
      ) : (
        <InvestmentList
          investments={investments}
          title="Investment history"
          description="All executive contributions into the company capital pool."
          emptyTitle="No investments match this filter."
          showExecutive
          executiveLabel={(row) => {
            const withExec = allInvestments.find((item) => item.id === row.id)
            return withExec?.executive_name || withExec?.executive_email || null
          }}
        />
      )}
    </div>
  )
}
