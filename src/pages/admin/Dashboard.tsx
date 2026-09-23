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
import { Stat, StatGrid } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { DealCards, FolderCards } from '@/components/hierarchy/Hierarchy'
import { useAdminDashboardStats } from '@/features/dashboard/useAdminDashboardStats'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { Button } from '@/components/ui/Button'

export function AdminDashboard() {
  const { user } = useAuth()
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
    <div className="ui-page max-w-4xl">
      <PageHeader
        eyebrow="Operations"
        title="Admin workspace"
        description={
          user?.email
            ? `Signed in as ${user.email}. Open a folder to continue.`
            : 'Open a folder to continue.'
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
          <StatGrid>
            <Stat label="Active deals" value={stats.activeLands} />
            <Stat label="Docs awaiting sign" value={stats.docsAwaitingSign} />
            <Stat label="Pending payments" value={stats.pendingPayments} />
            <Stat label="Unread messages" value={stats.unreadMessages} />
          </StatGrid>

          <div>
            <h2 className="ui-section-title">Areas</h2>
            <p className="ui-section-desc mb-4">Grouped the same way as the side drawer.</p>
            <FolderCards
              folders={[
                {
                  id: 'users',
                  title: 'Users',
                  description: 'Provision and control portal accounts',
                  icon: <Users className="h-5 w-5" />,
                  onSelect: () => navigate('/admin/users'),
                },
                {
                  id: 'deals',
                  title: 'Land records',
                  description: 'Deal workspaces and site maps',
                  icon: <FolderKanban className="h-5 w-5" />,
                  count: stats.activeLands,
                  onSelect: () => navigate('/admin/land-records'),
                },
                {
                  id: 'analytics',
                  title: 'Analytics',
                  description: 'Charts, progress, and CSV export',
                  icon: <BarChart3 className="h-5 w-5" />,
                  onSelect: () => navigate('/admin/analytics'),
                },
                {
                  id: 'media',
                  title: 'Media',
                  description: 'Field photos and video vault',
                  icon: <Video className="h-5 w-5" />,
                  onSelect: () => navigate('/admin/media-hub'),
                },
                {
                  id: 'documents',
                  title: 'Documents',
                  description: 'Deal files and agent agreements',
                  icon: <FileText className="h-5 w-5" />,
                  count: stats.docsAwaitingSign,
                  onSelect: () => navigate('/admin/documents-hub'),
                },
                {
                  id: 'finance',
                  title: 'Finance',
                  description: 'Payments, capital pool, and wallet',
                  icon: <Landmark className="h-5 w-5" />,
                  count: stats.pendingPayments,
                  onSelect: () => navigate('/admin/finance'),
                },
                {
                  id: 'pipeline',
                  title: 'Pipeline',
                  description: 'Suggestions, community, and cargo',
                  icon: <Package className="h-5 w-5" />,
                  onSelect: () => navigate('/admin/pipeline'),
                },
                {
                  id: 'messages',
                  title: 'Messages',
                  description: 'Seller and executive chat',
                  icon: <MessageSquare className="h-5 w-5" />,
                  count: stats.unreadMessages,
                  onSelect: () => navigate('/admin/chat'),
                },
                {
                  id: 'audit',
                  title: 'Audit log',
                  description: 'Change history across the platform',
                  icon: <ClipboardList className="h-5 w-5" />,
                  onSelect: () => navigate('/admin/audit-log'),
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
                <Button onClick={() => navigate('/admin/land-records?folder=create')}>
                  Create land record
                </Button>
              }
              prompt="Select a deal to continue."
            />
          </div>
        </>
      )}
    </div>
  )
}
