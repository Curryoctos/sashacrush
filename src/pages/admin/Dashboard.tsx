import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  FolderKanban,
  Landmark,
  MessageSquare,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  DealCards,
  FolderCards,
  HierarchyNav,
} from '@/components/hierarchy/Hierarchy'
import { useAdminDashboardStats } from '@/features/dashboard/useAdminDashboardStats'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'

type AdminDashFolder = 'users' | 'deals' | 'documents' | 'payments' | 'capital' | 'messages' | 'audit'

function isAdminDashFolder(value: string | null): value is AdminDashFolder {
  return (
    value === 'users' ||
    value === 'deals' ||
    value === 'documents' ||
    value === 'payments' ||
    value === 'capital' ||
    value === 'messages' ||
    value === 'audit'
  )
}

const FOLDER_META: Record<
  AdminDashFolder,
  { title: string; description: string; to: string }
> = {
  users: {
    title: 'Users',
    description: 'Provision and control portal accounts',
    to: '/admin/users',
  },
  deals: {
    title: 'Active deals',
    description: 'Open a deal workspace',
    to: '/admin/land-records',
  },
  documents: {
    title: 'Documents',
    description: 'Signing and deal files',
    to: '/admin/documents',
  },
  payments: {
    title: 'Payments',
    description: 'Pay out and confirm seller disbursements',
    to: '/admin/payments',
  },
  capital: {
    title: 'Capital',
    description: 'Confirm executive investments into the company pool',
    to: '/admin/capital',
  },
  messages: {
    title: 'Messages',
    description: 'Seller and executive chat',
    to: '/admin/chat',
  },
  audit: {
    title: 'Audit log',
    description: 'Change history across the platform',
    to: '/admin/audit-log',
  },
}

export function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: stats, isLoading, error } = useAdminDashboardStats()

  const folderParam = searchParams.get('folder')
  const selectedFolder = isAdminDashFolder(folderParam) ? folderParam : null

  const setFolder = (folder: AdminDashFolder | null) => {
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

      {stats && !selectedFolder && (
        <FolderCards
          folders={[
            {
              id: 'users',
              title: FOLDER_META.users.title,
              description: FOLDER_META.users.description,
              icon: <Users className="h-5 w-5" />,
              onSelect: () => navigate(FOLDER_META.users.to),
            },
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
              id: 'payments',
              title: FOLDER_META.payments.title,
              description: FOLDER_META.payments.description,
              icon: <Wallet className="h-5 w-5" />,
              count: stats.pendingPayments,
              onSelect: () => setFolder('payments'),
            },
            {
              id: 'capital',
              title: FOLDER_META.capital.title,
              description: FOLDER_META.capital.description,
              icon: <Landmark className="h-5 w-5" />,
              onSelect: () => navigate(FOLDER_META.capital.to),
            },
            {
              id: 'messages',
              title: FOLDER_META.messages.title,
              description: FOLDER_META.messages.description,
              icon: <MessageSquare className="h-5 w-5" />,
              count: stats.unreadMessages,
              onSelect: () => setFolder('messages'),
            },
            {
              id: 'audit',
              title: FOLDER_META.audit.title,
              description: FOLDER_META.audit.description,
              icon: <ClipboardList className="h-5 w-5" />,
              onSelect: () => setFolder('audit'),
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
            onSelect={(id) => navigate(`/admin/land-records?land=${id}`)}
            emptyTitle="No active deals yet"
            emptyDescription="Create a land record to start a transaction workspace."
            emptyAction={
              <Button onClick={() => navigate('/admin/land-records?folder=create')}>
                Create land record
              </Button>
            }
            prompt="Recent deals — open one to continue."
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/admin/land-records')}
              >
                View all
              </Button>
            }
          />
        </div>
      )}

      {stats && selectedFolder && selectedFolder !== 'deals' && (
        <ModuleLeaf
          title={FOLDER_META[selectedFolder].title}
          description={FOLDER_META[selectedFolder].description}
          countLabel={moduleCountLabel(selectedFolder, stats)}
          onBack={() => setFolder(null)}
          onOpen={() => navigate(FOLDER_META[selectedFolder].to)}
        />
      )}
    </div>
  )
}

function moduleCountLabel(
  folder: Exclude<AdminDashFolder, 'deals'>,
  stats: {
    docsAwaitingSign: number
    pendingPayments: number
    unreadMessages: number
  },
): string | null {
  if (folder === 'documents') {
    return `${stats.docsAwaitingSign} awaiting signature`
  }
  if (folder === 'payments') {
    return `${stats.pendingPayments} pending`
  }
  if (folder === 'messages') {
    return `${stats.unreadMessages} unread`
  }
  return null
}

function ModuleLeaf({
  title,
  description,
  countLabel,
  onBack,
  onOpen,
}: {
  title: string
  description: string
  countLabel: string | null
  onBack: () => void
  onOpen: () => void
}) {
  return (
    <div className="space-y-5">
      <HierarchyNav
        crumbs={[{ label: 'Workspace', onClick: onBack }, { label: title }]}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="ui-section-title">{title}</h2>
          <p className="ui-section-desc">{description}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Workspace
        </Button>
      </div>
      <div className="ui-panel p-5">
        {countLabel ? <p className="text-sm text-muted">{countLabel}</p> : null}
        <p className={`${countLabel ? 'mt-2' : ''} text-sm text-muted`}>
          Open the full {title.toLowerCase()} workspace to browse deals and folders.
        </p>
        <div className="mt-4">
          <Button onClick={onOpen}>Open {title.toLowerCase()}</Button>
        </div>
      </div>
    </div>
  )
}
