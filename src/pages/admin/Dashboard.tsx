import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  ClipboardList,
  FileText,
  FolderKanban,
  Landmark,
  MessageSquare,
  Package,
  Users,
  Video,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DealCards, FolderCards } from '@/components/hierarchy/Hierarchy'
import { useAdminDashboardStats } from '@/features/dashboard/useAdminDashboardStats'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { Button } from '@/components/ui/Button'

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

export function AdminDashboard() {
  const navigate = useNavigate()
  const { data: stats, isLoading, error } = useAdminDashboardStats()

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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Active deals" value={stats.activeLands} />
              <Metric
                label="Docs awaiting sign"
                value={stats.docsAwaitingSign}
              />
              <Metric label="Pending payments" value={stats.pendingPayments} />
              <Metric label="Unread messages" value={stats.unreadMessages} />
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="ui-section-title">Areas</h2>
            </div>
            <FolderCards
              folders={[
                {
                  id: 'users',
                  title: 'Users',
                  description: 'Provision and control portal accounts',
                  icon: <Users strokeWidth={1.75} />,
                  onSelect: () => navigate('/admin/users'),
                },
                {
                  id: 'projects',
                  title: 'Projects',
                  description: 'Funding catalog and land deal workspaces',
                  icon: <FolderKanban strokeWidth={1.75} />,
                  count: stats.activeLands,
                  onSelect: () => navigate('/admin/projects'),
                },
                {
                  id: 'analytics',
                  title: 'Analytics',
                  description: 'Charts, progress, and CSV export',
                  icon: <BarChart3 strokeWidth={1.75} />,
                  onSelect: () => navigate('/admin/analytics'),
                },
                {
                  id: 'media',
                  title: 'Media',
                  description: 'Field photos and video vault',
                  icon: <Video strokeWidth={1.75} />,
                  onSelect: () => navigate('/admin/media-hub'),
                },
                {
                  id: 'documents',
                  title: 'Documents',
                  description: 'Deal files and agent agreements',
                  icon: <FileText strokeWidth={1.75} />,
                  count: stats.docsAwaitingSign,
                  onSelect: () => navigate('/admin/documents-hub'),
                },
                {
                  id: 'finance',
                  title: 'Finance',
                  description: 'Payments, capital pool, and wallet',
                  icon: <Landmark strokeWidth={1.75} />,
                  count: stats.pendingPayments,
                  onSelect: () => navigate('/admin/finance'),
                },
                {
                  id: 'pipeline',
                  title: 'Pipeline',
                  description: 'Suggestions, community, and cargo',
                  icon: <Package strokeWidth={1.75} />,
                  onSelect: () => navigate('/admin/pipeline'),
                },
                {
                  id: 'messages',
                  title: 'Messages',
                  description: 'Seller and executive chat',
                  icon: <MessageSquare strokeWidth={1.75} />,
                  count: stats.unreadMessages,
                  onSelect: () => navigate('/admin/chat'),
                },
                {
                  id: 'audit',
                  title: 'Audit log',
                  description: 'Change history across the platform',
                  icon: <ClipboardList strokeWidth={1.75} />,
                  onSelect: () => navigate('/admin/audit-log'),
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
                onClick={() => navigate('/admin/land-records')}
              >
                View all
              </Button>
            </div>
            <DealCards
              deals={dealCards}
              onSelect={(id) => navigate(`/admin/land-records?land=${id}`)}
              emptyTitle="No active deals yet"
              emptyDescription="Create a land record to start a transaction workspace."
              emptyAction={
                <Button
                  onClick={() => navigate('/admin/land-records?folder=create')}
                >
                  Create land record
                </Button>
              }
            />
          </section>
        </>
      )}
    </div>
  )
}
