import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, FolderKanban, MessageSquare, Video } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { DealCards, FolderCards } from '@/components/hierarchy/Hierarchy'
import { useExecutiveDeals } from '@/features/deals/useDealSummary'
import { formatSupabaseError } from '@/lib/supabase-errors'

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-2 text-[28px] font-semibold tracking-tight text-ink tabular-nums">
        {value}
      </p>
    </div>
  )
}

export function ExecutiveDashboard() {
  const navigate = useNavigate()
  const { data: deals, isLoading, error } = useExecutiveDeals()

  const totals = useMemo(() => {
    return (deals ?? []).reduce(
      (acc, deal) => ({
        pendingDocs: acc.pendingDocs + Number(deal.pending_docs),
        pendingPayments: acc.pendingPayments + Number(deal.pending_payments),
      }),
      { pendingDocs: 0, pendingPayments: 0 },
    )
  }, [deals])

  const dealCards = useMemo(
    () =>
      (deals ?? []).slice(0, 8).map((deal) => ({
        id: deal.land_id,
        title: deal.title,
        hint: 'Open overview',
      })),
    [deals],
  )

  return (
    <div className="ui-page">
      <PageHeader title="Overview" />

      {isLoading && <p className="text-[13px] text-muted">Loading…</p>}

      {error && (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      )}

      {deals && (
        <>
          <section className="ui-panel p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="ui-section-title">Portfolio</h2>
              <p className="text-[12px] text-muted">Live counts</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              <Metric label="Active deals" value={deals.length} />
              <Metric label="Docs pending" value={totals.pendingDocs} />
              <Metric label="Payments pending" value={totals.pendingPayments} />
            </div>
          </section>

          <section>
            <h2 className="ui-section-title mb-4">Areas</h2>
            <FolderCards
              folders={[
                {
                  id: 'portfolio',
                  title: 'Portfolio',
                  description: 'Land deals and funding projects',
                  icon: <FolderKanban strokeWidth={1.75} />,
                  count: deals.length,
                  onSelect: () => navigate('/executive/portfolio'),
                },
                {
                  id: 'analytics',
                  title: 'Analytics',
                  description: 'Portfolio charts and progress',
                  icon: <BarChart3 strokeWidth={1.75} />,
                  onSelect: () => navigate('/executive/analytics'),
                },
                {
                  id: 'messages',
                  title: 'Communications',
                  description: 'Executive staff channel',
                  icon: <MessageSquare strokeWidth={1.75} />,
                  onSelect: () => navigate('/executive/communications'),
                },
                {
                  id: 'media',
                  title: 'Media vault',
                  description: 'Watch private project videos',
                  icon: <Video strokeWidth={1.75} />,
                  onSelect: () => navigate('/executive/media'),
                },
              ]}
            />
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="ui-section-title">Recent deals</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/executive/deals')}
              >
                View all
              </Button>
            </div>
            <DealCards
              deals={dealCards}
              onSelect={(id) => navigate(`/executive/deals?land=${id}`)}
              emptyTitle="No active deals to display."
            />
          </section>
        </>
      )}
    </div>
  )
}
