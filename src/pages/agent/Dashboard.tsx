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
import { Stat, StatGrid } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { DealCards, FolderCards } from '@/components/hierarchy/Hierarchy'
import { useAgentDashboardStats } from '@/features/dashboard/useAgentDashboardStats'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function AgentDashboard() {
  const { user } = useAuth()
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
    <div className="ui-page max-w-4xl">
      <PageHeader
        eyebrow="Field ops"
        title="Agent workspace"
        description={
          user?.email
            ? `Signed in as ${user.email}. Land maps, camera, paperwork, capital, and seller chat.`
            : 'Land maps, camera, paperwork, capital, and seller chat.'
        }
      />

      {isLoading && <p className="text-sm text-muted">Loading workspace…</p>}

      {error && (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      )}

      {stats && (
        <>
          <StatGrid className="lg:grid-cols-3">
            <Stat label="Active deals" value={stats.activeLands} />
            <Stat label="Docs awaiting sign" value={stats.docsAwaitingSign} />
            <Stat label="Unconfirmed payments" value={stats.pendingPayments} />
          </StatGrid>

          <div>
            <h2 className="ui-section-title">Areas</h2>
            <p className="ui-section-desc mb-4">Grouped the same way as the side drawer.</p>
            <FolderCards
              folders={[
                {
                  id: 'deals',
                  title: 'Land records',
                  description: 'Maps, site visits, and deal workspaces',
                  icon: <FolderKanban className="h-5 w-5" />,
                  count: stats.activeLands,
                  onSelect: () => navigate('/agent/land-records'),
                },
                {
                  id: 'analytics',
                  title: 'Analytics',
                  description: 'Deal progress and portfolio charts',
                  icon: <BarChart3 className="h-5 w-5" />,
                  onSelect: () => navigate('/agent/analytics'),
                },
                {
                  id: 'paperwork',
                  title: 'Paperwork',
                  description: 'Documents and payment receipts',
                  icon: <FileText className="h-5 w-5" />,
                  count: stats.docsAwaitingSign,
                  onSelect: () => navigate('/agent/paperwork'),
                },
                {
                  id: 'capital',
                  title: 'Capital',
                  description: 'Investments and agreements',
                  icon: <PiggyBank className="h-5 w-5" />,
                  onSelect: () => navigate('/agent/capital'),
                },
                {
                  id: 'suggestions',
                  title: 'Suggestions',
                  description: 'Propose ideas for active projects',
                  icon: <Lightbulb className="h-5 w-5" />,
                  onSelect: () => navigate('/agent/suggestions'),
                },
                {
                  id: 'cargo',
                  title: 'Cargo',
                  description: 'Assigned shipments and stage approvals',
                  icon: <Package className="h-5 w-5" />,
                  onSelect: () => navigate('/agent/cargo'),
                },
                {
                  id: 'photos',
                  title: 'Field photos',
                  description: 'GPS camera captures on site',
                  icon: <Camera className="h-5 w-5" />,
                  onSelect: () => navigate('/agent/photos'),
                },
                {
                  id: 'messages',
                  title: 'Messages',
                  description: 'Seller conversations',
                  icon: <MessageSquare className="h-5 w-5" />,
                  onSelect: () => navigate('/agent/chat'),
                },
              ]}
            />
          </div>

          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="ui-section-title">Recent deals</h2>
                <p className="ui-section-desc">Jump straight into a deal workspace.</p>
              </div>
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
              prompt="Select a deal to continue."
            />
          </div>
        </>
      )}
    </div>
  )
}
