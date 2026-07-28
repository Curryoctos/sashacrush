import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Camera, FileText, FolderKanban, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  DealCards,
  FolderCards,
  HierarchyNav,
} from '@/components/hierarchy/Hierarchy'
import { useAgentDashboardStats } from '@/features/dashboard/useAgentDashboardStats'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'

type AgentDashFolder = 'deals' | 'documents' | 'messages' | 'photos'

function isAgentDashFolder(value: string | null): value is AgentDashFolder {
  return (
    value === 'deals' ||
    value === 'documents' ||
    value === 'messages' ||
    value === 'photos'
  )
}

const FOLDER_META: Record<
  AgentDashFolder,
  { title: string; description: string; to: string }
> = {
  deals: {
    title: 'Active deals',
    description: 'Open a deal workspace',
    to: '/agent/land-records',
  },
  documents: {
    title: 'Documents',
    description: 'Signing and deal files',
    to: '/agent/documents',
  },
  messages: {
    title: 'Messages',
    description: 'Seller conversations',
    to: '/agent/chat',
  },
  photos: {
    title: 'Field photos',
    description: 'GPS-tagged captures',
    to: '/agent/photos',
  },
}

export function AgentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: stats, isLoading, error } = useAgentDashboardStats()

  const selectedFolder = isAgentDashFolder(searchParams.get('folder'))
    ? (searchParams.get('folder') as AgentDashFolder)
    : null

  const setFolder = (folder: AgentDashFolder | null) => {
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

      {stats && !selectedFolder && (
        <FolderCards
          folders={[
            {
              id: 'deals',
              title: FOLDER_META.deals.title,
              description: FOLDER_META.deals.description,
              icon: <FolderKanban className="h-5 w-5" />,
              count: stats.activeLands,
              onSelect: () => setFolder('deals'),
            },
            {
              id: 'documents',
              title: FOLDER_META.documents.title,
              description: FOLDER_META.documents.description,
              icon: <FileText className="h-5 w-5" />,
              count: stats.docsAwaitingSign,
              onSelect: () => setFolder('documents'),
            },
            {
              id: 'messages',
              title: FOLDER_META.messages.title,
              description: FOLDER_META.messages.description,
              icon: <MessageSquare className="h-5 w-5" />,
              onSelect: () => setFolder('messages'),
            },
            {
              id: 'photos',
              title: FOLDER_META.photos.title,
              description: FOLDER_META.photos.description,
              icon: <Camera className="h-5 w-5" />,
              onSelect: () => setFolder('photos'),
            },
          ]}
        />
      )}

      {stats && selectedFolder === 'deals' && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              { label: 'Workspace', onClick: () => setFolder(null) },
              { label: 'Active deals' },
            ]}
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="ui-section-title">Active deals</h2>
              <p className="ui-section-desc">Select a deal to open its folders</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setFolder(null)}>
              <ArrowLeft className="h-4 w-4" />
              Workspace
            </Button>
          </div>
          <DealCards
            deals={dealCards}
            onSelect={(id) => navigate(`/agent/land-records?land=${id}`)}
            emptyTitle="No active deals yet"
            prompt="Recent deals — open one to continue."
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/agent/land-records')}
              >
                View all
              </Button>
            }
          />
        </div>
      )}

      {stats && selectedFolder && selectedFolder !== 'deals' && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              { label: 'Workspace', onClick: () => setFolder(null) },
              { label: FOLDER_META[selectedFolder].title },
            ]}
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="ui-section-title">{FOLDER_META[selectedFolder].title}</h2>
              <p className="ui-section-desc">{FOLDER_META[selectedFolder].description}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setFolder(null)}>
              <ArrowLeft className="h-4 w-4" />
              Workspace
            </Button>
          </div>
          <div className="ui-panel p-5">
            {selectedFolder === 'documents' && (
              <p className="text-sm text-muted">
                {stats.docsAwaitingSign} document
                {stats.docsAwaitingSign === 1 ? '' : 's'} awaiting signature
              </p>
            )}
            <p
              className={`${selectedFolder === 'documents' ? 'mt-2' : ''} text-sm text-muted`}
            >
              Open the full workspace to browse by deal and folder.
            </p>
            <div className="mt-4">
              <Button onClick={() => navigate(FOLDER_META[selectedFolder].to)}>
                Open {FOLDER_META[selectedFolder].title.toLowerCase()}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
