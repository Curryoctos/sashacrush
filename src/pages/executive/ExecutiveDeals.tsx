import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, Stat, StatGrid } from '@/components/ui/Card'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { DealCards, HierarchyNav } from '@/components/hierarchy/Hierarchy'
import { useExecutiveDeals } from '@/features/deals/useDealSummary'
import { useLandHierarchyNav } from '@/hooks/useLandHierarchyNav'
import { useAuth } from '@/hooks/useAuth'
import { formatUsd } from '@/lib/land-records'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function ExecutiveDealsPage() {
  const { user } = useAuth()
  const dealsQuery = useExecutiveDeals()

  const deals = useMemo(
    () =>
      (dealsQuery.data ?? []).map((deal) => ({
        id: deal.land_id,
        title: deal.title,
        location: deal.location,
        seller_name: deal.seller_name,
        total_value_usd: deal.total_value_usd,
        status: deal.status,
        pending_docs: deal.pending_docs,
        signed_docs: deal.signed_docs,
        confirmed_payments: deal.confirmed_payments,
        pending_payments: deal.pending_payments,
      })),
    [dealsQuery.data],
  )

  const { selectedLand, setNavigation } = useLandHierarchyNav(deals)

  return (
    <div className="ui-page max-w-4xl">
      <div>
        <PageBackLink to="/executive/dashboard" label="Executive Dashboard" />
        <PageHeader
          className="mt-3"
          title="Deal Portfolio"
          description={
            user?.email
              ? `Signed in as ${user.email}. Open a deal for details.`
              : 'Open a deal for details.'
          }
        />
      </div>

      {dealsQuery.isLoading && <p className="text-sm text-muted">Loading deals…</p>}

      {dealsQuery.error && (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(dealsQuery.error as Error)}
        </p>
      )}

      {!dealsQuery.isLoading && !selectedLand && (
        <DealCards
          deals={deals.map((deal) => ({
            id: deal.id,
            title: deal.title,
            hint: 'Open overview',
          }))}
          onSelect={(id) => setNavigation(id, null)}
          emptyTitle="No active deals to display."
          prompt="Select a deal to review status."
        />
      )}

      {selectedLand && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              { label: 'All deals', onClick: () => setNavigation(null, null) },
              { label: selectedLand.title },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="ui-section-title">{selectedLand.title}</h2>
                <Badge tone={statusTone(selectedLand.status)}>{selectedLand.status}</Badge>
              </div>
              <p className="ui-section-desc">{selectedLand.location ?? 'Deal overview'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setNavigation(null, null)}>
                <ArrowLeft className="h-4 w-4" />
                All deals
              </Button>
              <Link to={`/executive/deals/${selectedLand.id}`}>
                <Button size="sm">Full detail</Button>
              </Link>
            </div>
          </div>

          <Card>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  Seller
                </dt>
                <dd className="mt-1 text-sm font-medium text-ink">
                  {selectedLand.seller_name ?? 'Unassigned'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  Value
                </dt>
                <dd className="mt-1 text-sm font-medium text-ink">
                  {formatUsd(Number(selectedLand.total_value_usd))}
                </dd>
              </div>
            </dl>
          </Card>

          <StatGrid>
            <Stat label="Docs awaiting" value={String(selectedLand.pending_docs)} />
            <Stat label="Docs signed" value={String(selectedLand.signed_docs)} />
            <Stat label="Payments confirmed" value={String(selectedLand.confirmed_payments)} />
            <Stat label="Payments pending" value={String(selectedLand.pending_payments)} />
          </StatGrid>
        </div>
      )}
    </div>
  )
}
