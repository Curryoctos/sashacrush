import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, Stat, StatGrid } from '@/components/ui/Card'
import { EmptyState, PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { useExecutiveDeal } from '@/features/deals/useDealSummary'
import { formatUsd } from '@/lib/land-records'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function ExecutiveDealPage() {
  const { landId = '' } = useParams()
  const dealQuery = useExecutiveDeal(landId)

  return (
    <div className="ui-page max-w-4xl">
      <div>
        <PageBackLink to="/executive/deals" label="Deal Portfolio" />
        <PageHeader className="mt-3" title="Deal Summary" />
      </div>

      {dealQuery.isLoading && <p className="text-sm text-muted">Loading deal…</p>}

      {dealQuery.error && (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(dealQuery.error as Error)}
        </p>
      )}

      {!dealQuery.isLoading && !dealQuery.error && !dealQuery.data && (
        <EmptyState title="Deal not found." />
      )}

      {dealQuery.data && (
        <>
          <Card>
            <h2 className="font-display text-lg font-semibold text-ink">{dealQuery.data.title}</h2>
            <p className="mt-1 text-sm text-muted">{dealQuery.data.location}</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  Seller
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {dealQuery.data.seller_name ?? 'Unassigned'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  Total value
                </dt>
                <dd className="mt-1 text-sm font-medium text-ink">
                  {formatUsd(Number(dealQuery.data.total_value_usd))}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  Status
                </dt>
                <dd className="mt-1 text-sm capitalize text-ink">{dealQuery.data.status}</dd>
              </div>
            </dl>
          </Card>

          <StatGrid>
            <Stat label="Docs awaiting sign" value={String(dealQuery.data.pending_docs)} />
            <Stat label="Signed documents" value={String(dealQuery.data.signed_docs)} />
            <Stat
              label="Payments confirmed"
              value={String(dealQuery.data.confirmed_payments)}
            />
            <Stat label="Payments pending" value={String(dealQuery.data.pending_payments)} />
          </StatGrid>

          <div>
            <Link to="/executive/chat">
              <Button>Executive communications</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
