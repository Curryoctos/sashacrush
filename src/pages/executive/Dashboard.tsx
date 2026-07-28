import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FolderKanban, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  DealCards,
  FolderCards,
  HierarchyNav,
} from '@/components/hierarchy/Hierarchy'
import { useExecutiveDeals } from '@/features/deals/useDealSummary'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'

type ExecDashFolder = 'deals' | 'messages'

function isExecDashFolder(value: string | null): value is ExecDashFolder {
  return value === 'deals' || value === 'messages'
}

export function ExecutiveDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: deals, isLoading, error } = useExecutiveDeals()

  const selectedFolder = isExecDashFolder(searchParams.get('folder'))
    ? (searchParams.get('folder') as ExecDashFolder)
    : null

  const setFolder = (folder: ExecDashFolder | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (folder) {
        next.set('folder', folder)
      } else {
        next.delete('folder')
      }
      return next
    })
  }

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
        eyebrow="Portfolio"
        title="Executive workspace"
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

      {deals && !selectedFolder && (
        <FolderCards
          folders={[
            {
              id: 'deals',
              title: 'Deal portfolio',
              description: 'Review active land transactions',
              icon: <FolderKanban className="h-5 w-5" />,
              count: deals.length,
              onSelect: () => setFolder('deals'),
            },
            {
              id: 'messages',
              title: 'Communications',
              description: 'Executive staff channel',
              icon: <MessageSquare className="h-5 w-5" />,
              onSelect: () => setFolder('messages'),
            },
          ]}
        />
      )}

      {deals && selectedFolder === 'deals' && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              { label: 'Workspace', onClick: () => setFolder(null) },
              { label: 'Deal portfolio' },
            ]}
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="ui-section-title">Deal portfolio</h2>
              <p className="ui-section-desc">
                {totals.pendingDocs} docs pending · {totals.pendingPayments} payments pending
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setFolder(null)}>
                <ArrowLeft className="h-4 w-4" />
                Workspace
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/executive/deals')}
              >
                View all
              </Button>
            </div>
          </div>
          <DealCards
            deals={dealCards}
            onSelect={(id) => navigate(`/executive/deals?land=${id}`)}
            emptyTitle="No active deals to display."
            prompt="Select a deal for a high-level overview."
          />
        </div>
      )}

      {deals && selectedFolder === 'messages' && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              { label: 'Workspace', onClick: () => setFolder(null) },
              { label: 'Communications' },
            ]}
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="ui-section-title">Communications</h2>
              <p className="ui-section-desc">Executive staff channel</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setFolder(null)}>
              <ArrowLeft className="h-4 w-4" />
              Workspace
            </Button>
          </div>
          <div className="ui-panel p-5">
            <p className="text-sm text-muted">
              Open the executive chat channel to continue the conversation.
            </p>
            <div className="mt-4">
              <Button onClick={() => navigate('/executive/chat')}>Open communications</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
