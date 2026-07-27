import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Wallet,
} from 'lucide-react'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, Stat, StatGrid } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/PageHeader'
import { IconActionButton } from '@/components/ui/IconActionButton'
import { useDealSummary } from '@/features/deals/useDealSummary'
import { LandRecordForm } from '@/features/land-records/components/LandRecordForm'
import {
  LAND_FOLDER_DESCRIPTIONS,
  LAND_FOLDER_LABELS,
  isLandFolder,
  type LandFolderId,
} from '@/features/land-records/landFolders'
import { computeDealBalance } from '@/features/payments/balance'
import { formatUsd } from '@/lib/land-records'
import { formatSupabaseError } from '@/lib/supabase-errors'
import type { LandRecord, LandRecordFormValues, SellerOption } from '@/types'

type LandListItem = LandRecord & { seller_label?: string }

const FOLDER_ICONS: Record<LandFolderId, typeof FileText> = {
  overview: LayoutDashboard,
  documents: FileText,
  messages: MessageSquare,
  payments: Wallet,
  photos: Camera,
  edit: Pencil,
}

export interface LandRecordsBrowserProps {
  lands: LandListItem[]
  isLoadingLands?: boolean
  landsError?: Error | null
  roleBasePath: '/admin' | '/agent'
  folders: LandFolderId[]
  includeUnread?: boolean
  canCreate?: boolean
  sellers?: SellerOption[]
  createForm?: {
    form: LandRecordFormValues
    fieldErrors: Partial<Record<keyof LandRecordFormValues, string>>
    isSaving: boolean
    formError: string | null
    formSuccess: string | null
    onChange: <K extends keyof LandRecordFormValues>(
      key: K,
      value: LandRecordFormValues[K],
    ) => void
    onSubmit: () => void
    onCancel: () => void
    onStartCreate?: () => void
  }
  editForm?: {
    form: LandRecordFormValues
    fieldErrors: Partial<Record<keyof LandRecordFormValues, string>>
    isSaving: boolean
    formError: string | null
    formSuccess: string | null
    onChange: <K extends keyof LandRecordFormValues>(
      key: K,
      value: LandRecordFormValues[K],
    ) => void
    onSubmit: () => void
    onStartEdit: (land: LandRecord) => void
  }
  emptyTitle?: string
  emptyDescription?: string
}

export function LandRecordsBrowser({
  lands,
  isLoadingLands = false,
  landsError = null,
  roleBasePath,
  folders,
  includeUnread = false,
  canCreate = false,
  sellers = [],
  createForm,
  editForm,
  emptyTitle = 'No land records yet',
  emptyDescription = 'Land deals appear here once records are created.',
}: LandRecordsBrowserProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const landFromQuery = searchParams.get('land')
  const folderFromQuery = searchParams.get('folder')
  const creating = folderFromQuery === 'create' && canCreate && Boolean(createForm)

  const selectedLandId = useMemo(() => {
    if (landFromQuery && lands.some((land) => land.id === landFromQuery)) {
      return landFromQuery
    }
    return null
  }, [landFromQuery, lands])

  const selectedFolder =
    isLandFolder(folderFromQuery) && folders.includes(folderFromQuery)
      ? folderFromQuery
      : null

  const selectedLand = lands.find((land) => land.id === selectedLandId) ?? null

  const setNavigation = (landId: string | null, folder: LandFolderId | 'create' | null) => {
    const next = new URLSearchParams()
    if (landId) {
      next.set('land', landId)
    }
    if (folder) {
      next.set('folder', folder)
    }
    setSearchParams(next)
  }

  if (isLoadingLands) {
    return <p className="text-sm text-muted">Loading land records…</p>
  }

  if (landsError) {
    return (
      <p className="ui-alert-danger" role="alert">
        {formatSupabaseError(landsError)}
      </p>
    )
  }

  if (creating && createForm) {
    return (
      <div className="space-y-5">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <button
            type="button"
            className="font-medium text-brand-700 hover:text-brand-800"
            onClick={() => setNavigation(null, null)}
          >
            All deals
          </button>
          <span aria-hidden>/</span>
          <span className="text-ink">New land record</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="ui-section-title">Create land record</h2>
            <p className="ui-section-desc">Add a deal workspace for documents, payments, and chat.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setNavigation(null, null)}>
            <ArrowLeft className="h-4 w-4" />
            All deals
          </Button>
        </div>

        <Card>
          <LandRecordForm
            form={createForm.form}
            fieldErrors={createForm.fieldErrors}
            sellers={sellers}
            mode="create"
            isSaving={createForm.isSaving}
            formError={createForm.formError}
            formSuccess={createForm.formSuccess}
            onChange={createForm.onChange}
            onSubmit={createForm.onSubmit}
            onCancel={createForm.onCancel}
          />
        </Card>
      </div>
    )
  }

  if (selectedLand && selectedFolder) {
    return (
      <FolderDetail
        land={selectedLand}
        folder={selectedFolder}
        roleBasePath={roleBasePath}
        includeUnread={includeUnread}
        sellers={sellers}
        editForm={editForm}
        onBackToFolders={() => setNavigation(selectedLand.id, null)}
        onBackToDeals={() => setNavigation(null, null)}
      />
    )
  }

  if (selectedLand) {
    return (
      <div className="space-y-5">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <button
            type="button"
            className="font-medium text-brand-700 hover:text-brand-800"
            onClick={() => setNavigation(null, null)}
          >
            All deals
          </button>
          <span aria-hidden>/</span>
          <span className="text-ink">{selectedLand.title}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="ui-section-title">{selectedLand.title}</h2>
              <Badge tone={statusTone(selectedLand.status)}>{selectedLand.status}</Badge>
            </div>
            <p className="ui-section-desc">
              {selectedLand.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {selectedLand.location}
                </span>
              ) : (
                'Choose a folder to work this deal'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setNavigation(null, null)}>
              <ArrowLeft className="h-4 w-4" />
              All deals
            </Button>
            {editForm && folders.includes('edit') && (
              <IconActionButton
                label="Edit details"
                icon={<Pencil className="h-4 w-4" />}
                onClick={() => {
                  editForm.onStartEdit(selectedLand)
                  setNavigation(selectedLand.id, 'edit')
                }}
              />
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {folders.map((folder) => {
            const FolderIcon = FOLDER_ICONS[folder]
            return (
              <button
                key={folder}
                type="button"
                onClick={() => {
                  if (folder === 'edit' && editForm) {
                    editForm.onStartEdit(selectedLand)
                  }
                  setNavigation(selectedLand.id, folder)
                }}
                className="group rounded-lg border border-border bg-surface-elevated p-5 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface text-brand-800 transition group-hover:bg-white">
                  <FolderIcon className="h-5 w-5" aria-hidden />
                </div>
                <p className="mt-4 text-sm font-semibold text-ink">{LAND_FOLDER_LABELS[folder]}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {LAND_FOLDER_DESCRIPTIONS[folder]}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (lands.length === 0 && !canCreate) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Select a land deal to open its workspace folders.</p>
        {canCreate && createForm && (
          <IconActionButton
            label="Create land record"
            icon={<Plus className="h-4 w-4" />}
            variant="primary"
            onClick={() => {
              createForm.onStartCreate?.()
              setNavigation(null, 'create')
            }}
          />
        )}
      </div>

      {lands.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={
            canCreate && createForm ? (
              <Button
                onClick={() => {
                  createForm.onStartCreate?.()
                  setNavigation(null, 'create')
                }}
              >
                <Plus className="h-4 w-4" />
                Create land record
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lands.map((land) => (
            <button
              key={land.id}
              type="button"
              onClick={() => setNavigation(land.id, null)}
              className="group rounded-lg border border-border bg-surface-elevated p-5 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-800">
                <FolderOpen className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 truncate text-sm font-semibold text-ink group-hover:text-brand-900">
                {land.title}
              </h3>
              <p className="mt-1 text-xs text-muted">
                {land.status === 'archived' ? 'Archived · open folders' : 'Open folders'}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FolderDetail({
  land,
  folder,
  roleBasePath,
  includeUnread,
  sellers,
  editForm,
  onBackToFolders,
  onBackToDeals,
}: {
  land: LandListItem
  folder: LandFolderId
  roleBasePath: '/admin' | '/agent'
  includeUnread: boolean
  sellers: SellerOption[]
  editForm?: LandRecordsBrowserProps['editForm']
  onBackToFolders: () => void
  onBackToDeals: () => void
}) {
  const FolderIcon = FOLDER_ICONS[folder]
  const destination = folderDestination(roleBasePath, land.id, folder)

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <button
          type="button"
          className="font-medium text-brand-700 hover:text-brand-800"
          onClick={onBackToDeals}
        >
          All deals
        </button>
        <span aria-hidden>/</span>
        <button
          type="button"
          className="font-medium text-brand-700 hover:text-brand-800"
          onClick={onBackToFolders}
        >
          {land.title}
        </button>
        <span aria-hidden>/</span>
        <span className="text-ink">{LAND_FOLDER_LABELS[folder]}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
            <FolderIcon className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="ui-section-title">{LAND_FOLDER_LABELS[folder]}</h2>
            <p className="ui-section-desc">
              {LAND_FOLDER_DESCRIPTIONS[folder]} · {land.title}
            </p>
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={onBackToFolders}>
          <ArrowLeft className="h-4 w-4" />
          Folders
        </Button>
      </div>

      {folder === 'overview' && (
        <OverviewPanel landId={land.id} includeUnread={includeUnread} />
      )}

      {folder === 'edit' && editForm && (
        <Card>
          <LandRecordForm
            form={editForm.form}
            fieldErrors={editForm.fieldErrors}
            sellers={sellers}
            mode="edit"
            isSaving={editForm.isSaving}
            formError={editForm.formError}
            formSuccess={editForm.formSuccess}
            onChange={editForm.onChange}
            onSubmit={editForm.onSubmit}
            onCancel={onBackToFolders}
          />
        </Card>
      )}

      {destination && (
        <Card>
          <p className="text-sm text-muted">
            Open the full {LAND_FOLDER_LABELS[folder].toLowerCase()} workspace for this deal.
          </p>
          <div className="mt-4">
            <Link to={destination}>
              <Button>
                Open {LAND_FOLDER_LABELS[folder].toLowerCase()}
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}

function OverviewPanel({
  landId,
  includeUnread,
}: {
  landId: string
  includeUnread: boolean
}) {
  const dealQuery = useDealSummary(landId, includeUnread)

  if (dealQuery.isLoading) {
    return <p className="text-sm text-muted">Loading overview…</p>
  }

  if (dealQuery.error || !dealQuery.data) {
    return (
      <p className="ui-alert-danger" role="alert">
        {dealQuery.error
          ? formatSupabaseError(dealQuery.error as Error)
          : 'Could not load deal overview.'}
      </p>
    )
  }

  const deal = dealQuery.data
  const pendingDocs = deal.documents.filter((doc) => doc.status === 'sent').length
  const signedDocs = deal.documents.filter((doc) => doc.status === 'signed').length
  const confirmedPayments = deal.payments.filter((payment) => payment.status === 'confirmed').length
  const pendingPayments = deal.payments.filter((payment) => payment.status !== 'confirmed').length
  const balance = computeDealBalance(deal.land.total_value_usd, deal.payments)

  return (
    <div className="space-y-4">
      <Card>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Seller" value={deal.land.seller_name ?? 'Unassigned'} />
          <Metric label="Total value" value={formatUsd(deal.land.total_value_usd)} />
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Status</dt>
            <dd className="mt-1">
              <Badge tone={statusTone(deal.land.status)}>{deal.land.status}</Badge>
            </dd>
          </div>
          <Metric label="Paid" value={formatUsd(balance.paidUsd)} />
          <Metric label="Outstanding" value={formatUsd(balance.outstandingUsd)} />
          <Metric label="Pending payments" value={formatUsd(balance.pendingUsd)} />
        </dl>
      </Card>

      <StatGrid>
        {includeUnread && <Stat label="Unread messages" value={String(deal.unreadCount)} />}
        <Stat label="Docs awaiting sign" value={String(pendingDocs)} />
        <Stat label="Signed documents" value={String(signedDocs)} />
        <Stat
          label="Payments"
          value={`${confirmedPayments} confirmed / ${pendingPayments} pending`}
        />
      </StatGrid>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  )
}

function folderDestination(
  roleBasePath: '/admin' | '/agent',
  landId: string,
  folder: LandFolderId,
): string | null {
  switch (folder) {
    case 'documents':
      return `${roleBasePath}/documents?land=${landId}`
    case 'messages':
      return `${roleBasePath}/chat?land=${landId}`
    case 'payments':
      return roleBasePath === '/admin' ? `/admin/payments?land=${landId}` : null
    case 'photos':
      return roleBasePath === '/agent' ? `/agent/photos?land=${landId}` : null
    default:
      return null
  }
}
