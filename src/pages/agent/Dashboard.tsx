import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Camera,
  FileText,
  FolderKanban,
  Lightbulb,
  MessageSquare,
  Package,
  PiggyBank,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { DealCards, FolderCards } from '@/components/hierarchy/Hierarchy'
import { useAgentDashboardStats } from '@/features/dashboard/useAgentDashboardStats'
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

export function AgentDashboard() {
  const navigate = useNavigate()
  const { data: stats, isLoading, error } = useAgentDashboardStats()

  const dealCards = useMemo(
    () =>
      (stats?.recentDeals ?? []).map((deal) => ({
        id: deal.id,
        title: deal.title,
        hint: 'Open folders',
      })),
    [stats?.recentDeals],
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

      {stats && (
        <>
          <section className="ui-panel p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="ui-section-title">Workspace</h2>
              <p className="text-[12px] text-muted">Live counts</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              <Metric label="Active deals" value={stats.activeLands} />
              <Metric
                label="Docs awaiting sign"
                value={stats.docsAwaitingSign}
              />
              <Metric
                label="Unconfirmed payments"
                value={stats.pendingPayments}
              />
            </div>
          </section>

          <section>
            <h2 className="ui-section-title mb-4">Areas</h2>
            <FolderCards
              folders={[
                {
                  id: 'deals',
                  title: 'Land records',
                  description: 'Maps, site visits, and deal workspaces',
                  icon: <FolderKanban strokeWidth={1.75} />,
                  count: stats.activeLands,
                  onSelect: () => navigate('/agent/land-records'),
                },
                {
                  id: 'analytics',
                  title: 'Analytics',
                  description: 'Deal progress and portfolio charts',
                  icon: <BarChart3 strokeWidth={1.75} />,
                  onSelect: () => navigate('/agent/analytics'),
                },
                {
                  id: 'paperwork',
                  title: 'Paperwork',
                  description: 'Documents and payment receipts',
                  icon: <FileText strokeWidth={1.75} />,
                  count: stats.docsAwaitingSign,
                  onSelect: () => navigate('/agent/paperwork'),
                },
                {
                  id: 'capital',
                  title: 'Capital',
                  description: 'Investments and agreements',
                  icon: <PiggyBank strokeWidth={1.75} />,
                  onSelect: () => navigate('/agent/capital'),
                },
                {
                  id: 'suggestions',
                  title: 'Suggestions',
                  description: 'Propose ideas for active projects',
                  icon: <Lightbulb strokeWidth={1.75} />,
                  onSelect: () => navigate('/agent/suggestions'),
                },
                {
                  id: 'cargo',
                  title: 'Cargo',
                  description: 'Assigned shipments and stage approvals',
                  icon: <Package strokeWidth={1.75} />,
                  onSelect: () => navigate('/agent/cargo'),
                },
                {
                  id: 'photos',
                  title: 'Field photos',
                  description: 'GPS camera captures on site',
                  icon: <Camera strokeWidth={1.75} />,
                  onSelect: () => navigate('/agent/photos'),
                },
                {
                  id: 'messages',
                  title: 'Messages',
                  description: 'Seller conversations',
                  icon: <MessageSquare strokeWidth={1.75} />,
                  onSelect: () => navigate('/agent/chat'),
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
                onClick={() => navigate('/agent/land-records')}
              >
                View all
              </Button>
            </div>
            <DealCards
              deals={dealCards}
              onSelect={(id) => navigate(`/agent/land-records?land=${id}`)}
              emptyTitle="No active deals yet"
            />
          </section>
        </>
      )}
    </div>
  )
}
