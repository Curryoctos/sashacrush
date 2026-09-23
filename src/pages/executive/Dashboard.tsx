import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, FolderKanban, MessageSquare, Video } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Stat, StatGrid } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { DealCards, FolderCards } from '@/components/hierarchy/Hierarchy'
import { useExecutiveDeals } from '@/features/deals/useDealSummary'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function ExecutiveDashboard() {
  const { user } = useAuth()
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
    <div className="ui-page max-w-4xl">
      <PageHeader
        eyebrow="Oversight"
        title="Executive workspace"
        description={
          user?.email
            ? `Signed in as ${user.email}. Portfolio status and staff communications.`
            : 'Portfolio status and staff communications.'
        }
      />

      {isLoading && <p className="text-sm text-muted">Loading workspace…</p>}

      {error && (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      )}

      {deals && (
        <>
          <StatGrid className="lg:grid-cols-3">
            <Stat label="Active deals" value={deals.length} />
            <Stat label="Docs pending" value={totals.pendingDocs} />
            <Stat label="Payments pending" value={totals.pendingPayments} />
          </StatGrid>

          <div>
            <h2 className="ui-section-title">Areas</h2>
            <p className="ui-section-desc mb-4">Portfolio oversight tools.</p>
            <FolderCards
              folders={[
                {
                  id: 'deals',
                  title: 'Deal portfolio',
                  description: 'High-level land deal status',
                  icon: <FolderKanban className="h-5 w-5" />,
                  count: deals.length,
                  onSelect: () => navigate('/executive/deals'),
                },
                {
                  id: 'analytics',
                  title: 'Analytics',
                  description: 'Portfolio charts and progress',
                  icon: <BarChart3 className="h-5 w-5" />,
                  onSelect: () => navigate('/executive/analytics'),
                },
                {
                  id: 'messages',
                  title: 'Communications',
                  description: 'Executive staff channel',
                  icon: <MessageSquare className="h-5 w-5" />,
                  onSelect: () => navigate('/executive/communications'),
                },
                {
                  id: 'media',
                  title: 'Media vault',
                  description: 'Watch private project videos',
                  icon: <Video className="h-5 w-5" />,
                  onSelect: () => navigate('/executive/media'),
                },
              ]}
            />
          </div>

          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="ui-section-title">Recent deals</h2>
                <p className="ui-section-desc">Select a deal for a high-level overview.</p>
              </div>
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
              prompt="Select a deal to continue."
            />
          </div>
        </>
      )}
    </div>
  )
}
