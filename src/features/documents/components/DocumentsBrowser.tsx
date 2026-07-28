import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, MapPin, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EmptyState } from '@/components/ui/PageHeader'
import { IconActionButton } from '@/components/ui/IconActionButton'
import { ViewModeToggle } from '@/components/ui/ViewModeToggle'
import { DocumentDetailDrawer } from '@/features/documents/components/DocumentDetailDrawer'
import { DocumentBoard } from '@/features/documents/components/DocumentBoard'
import { DocumentListView } from '@/features/documents/components/DocumentListView'
import { DocumentPreviewModal } from '@/features/documents/components/DocumentPreviewModal'
import { DocumentUpload } from '@/features/documents/components/DocumentUpload'
import {
  DOCUMENT_STAGE_LABELS,
  canEditDocumentPipeline,
  evaluateDocumentStageMove,
} from '@/features/documents/documentStages'
import { useDocumentCounts } from '@/features/documents/useDocumentCounts'
import {
  useDocumentWorkspace,
  type LandSummary,
} from '@/features/documents/useDocumentWorkspace'
import { useDocuments } from '@/features/documents/useDocuments'
import { notifyInfo } from '@/features/notifications/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'
import { formatSupabaseError } from '@/lib/supabase-errors'
import type { Document, DocumentStatus } from '@/types'

interface DocumentsBrowserProps {
  lands: LandSummary[]
  isLoadingLands?: boolean
  landsError?: Error | null
  canUpload?: boolean
  enableSendForSigning?: boolean
  highlightDocumentId?: string | null
  emptyTitle?: string
  emptyDescription?: string
  onSigned?: () => void
}

interface PendingStageMove {
  document: Document
  to: DocumentStatus
  reason: string
  confirmLabel: string
  tone: 'danger' | 'primary'
  sellerId: string | null
}

export function DocumentsBrowser({
  lands,
  isLoadingLands = false,
  landsError = null,
  canUpload = false,
  enableSendForSigning = false,
  highlightDocumentId = null,
  emptyTitle = 'No land deals yet',
  emptyDescription = 'Documents are organized by land deal. Create or assign a land record to get started.',
  onSigned,
}: DocumentsBrowserProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canEditStages = canEditDocumentPipeline(user?.role)
  const workspace = useDocumentWorkspace(lands)
  const landIds = useMemo(() => lands.map((land) => land.id), [lands])
  const countsQuery = useDocumentCounts(landIds)

  const [showUploadFor, setShowUploadFor] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<PendingStageMove | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const [stageMovers, setStageMovers] = useState<
    Record<
      string,
      (
        documentId: string,
        nextStatus: DocumentStatus,
        options?: { sellerId?: string | null },
      ) => Promise<Document>
    >
  >({})
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    if (!highlightDocumentId || !workspace.focusedLandId) {
      return
    }
    if (!workspace.expandedLandIds.has(workspace.focusedLandId)) {
      workspace.toggleLandExpanded(workspace.focusedLandId)
    }
    workspace.setDrawerDocumentId(highlightDocumentId)
    // Intentionally only react to deep-link changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightDocumentId, workspace.focusedLandId])

  const requestStageMove = (document: Document, to: DocumentStatus) => {
    if (!canEditStages) {
      setMoveError('You cannot change document stages with your role.')
      return
    }

    const evaluation = evaluateDocumentStageMove(document.status, to)
    if (evaluation.kind === 'blocked') {
      setMoveError(evaluation.reason)
      return
    }
    if (evaluation.kind === 'allowed') {
      return
    }

    const land = lands.find((item) => item.id === document.land_id)
    setMoveError(null)
    setPendingMove({
      document,
      to,
      reason: evaluation.reason,
      confirmLabel: evaluation.confirmLabel,
      tone: evaluation.tone ?? 'primary',
      sellerId: land?.seller_id ?? null,
    })
  }

  const confirmStageMove = async () => {
    if (!pendingMove) {
      return
    }

    const mover = stageMovers[pendingMove.document.land_id]
    if (!mover) {
      setMoveError('Open the land group before changing stages.')
      return
    }

    setIsMoving(true)
    setMoveError(null)

    try {
      await mover(pendingMove.document.id, pendingMove.to, {
        sellerId: pendingMove.sellerId,
      })
      notifyInfo(`Moved to ${DOCUMENT_STAGE_LABELS[pendingMove.to]}`)
      setPendingMove(null)
      void queryClient.invalidateQueries({
        queryKey: ['documents', pendingMove.document.land_id],
      })
      void queryClient.invalidateQueries({ queryKey: ['document-counts'] })
    } catch (error) {
      setMoveError(
        error instanceof Error ? error.message : 'Could not change document stage.',
      )
    } finally {
      setIsMoving(false)
    }
  }

  if (isLoadingLands) {
    return <p className="text-sm text-muted">Loading land deals…</p>
  }

  if (landsError) {
    return (
      <p className="ui-alert-danger" role="alert">
        {formatSupabaseError(landsError)}
      </p>
    )
  }

  if (lands.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  const visibleLands = workspace.focusedLandId
    ? lands.filter((land) => land.id === workspace.focusedLandId)
    : lands

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block min-w-[14rem] flex-1">
          <span className="ui-label">Search documents</span>
          <input
            className="ui-input mt-1"
            type="search"
            value={workspace.search}
            onChange={(event) => workspace.setSearch(event.target.value)}
            placeholder="Title or stage…"
            aria-label="Search documents"
          />
        </label>
        <ViewModeToggle value={workspace.viewMode} onChange={workspace.setViewMode} />
      </div>

      {countsQuery.isError ? (
        <p className="ui-alert-warning" role="alert">
          Could not load folder counts. Document lists below still work.
        </p>
      ) : null}

      {moveError && !pendingMove ? (
        <p className="ui-alert-danger" role="alert">
          {moveError}
        </p>
      ) : null}

      <div className="space-y-3">
        {visibleLands.map((land) => (
          <LandDocumentGroup
            key={land.id}
            land={land}
            counts={countsQuery.data?.[land.id]}
            countsLoading={countsQuery.isLoading}
            expanded={workspace.expandedLandIds.has(land.id)}
            onToggle={() => workspace.toggleLandExpanded(land.id)}
            onFocus={() => workspace.focusLand(land.id)}
            onClearFocus={
              workspace.focusedLandId ? () => workspace.focusLand(null) : undefined
            }
            canUpload={canUpload}
            showUpload={showUploadFor === land.id}
            onToggleUpload={() =>
              setShowUploadFor((current) => (current === land.id ? null : land.id))
            }
            canEditStages={canEditStages}
            enableSendForSigning={enableSendForSigning}
            viewMode={workspace.viewMode}
            selectedIds={workspace.selectedIds}
            highlightDocumentId={highlightDocumentId}
            drawerDocumentId={workspace.drawerDocumentId}
            expandedStages={workspace.expandedStages}
            onToggleStage={workspace.toggleStageExpanded}
            filterDocuments={workspace.filterDocuments}
            paginate={workspace.paginate}
            setPage={workspace.setPage}
            toggleSelected={workspace.toggleSelected}
            setAllSelected={workspace.setAllSelected}
            setDrawerDocumentId={workspace.setDrawerDocumentId}
            onRequestStageMove={requestStageMove}
            registerStageMover={(mover) => {
              setStageMovers((prev) => {
                if (prev[land.id] === mover) {
                  return prev
                }
                return { ...prev, [land.id]: mover }
              })
            }}
            onPreview={(document, url) => {
              setPreviewDocument(document)
              setPreviewUrl(url)
              setPreviewError(null)
            }}
            onPreviewError={(message) => setPreviewError(message)}
            onUploadComplete={() => {
              setShowUploadFor(null)
              void queryClient.invalidateQueries({ queryKey: ['documents', land.id] })
              void queryClient.invalidateQueries({ queryKey: ['document-counts'] })
              notifyInfo('Document uploaded')
            }}
            onSigned={onSigned}
            currentUserId={user?.id ?? null}
          />
        ))}
      </div>

      {previewError && !previewDocument ? (
        <p className="ui-alert-danger" role="alert">
          {previewError}
        </p>
      ) : null}

      <ConfirmModal
        open={Boolean(pendingMove)}
        title={
          pendingMove
            ? `Move to ${DOCUMENT_STAGE_LABELS[pendingMove.to]}`
            : 'Confirm stage change'
        }
        description={pendingMove?.reason}
        confirmLabel={pendingMove?.confirmLabel}
        tone={pendingMove?.tone}
        busy={isMoving}
        error={moveError}
        confirmDisabled={pendingMove?.to === 'sent' && !pendingMove.sellerId}
        onCancel={() => {
          setPendingMove(null)
          setMoveError(null)
        }}
        onConfirm={() => void confirmStageMove()}
      />

      {previewDocument && previewUrl ? (
        <DocumentPreviewModal
          title={previewDocument.title ?? 'Document preview'}
          previewUrl={previewUrl}
          filePath={previewDocument.file_path ?? ''}
          onClose={() => {
            setPreviewDocument(null)
            setPreviewUrl(null)
            setPreviewError(null)
          }}
        />
      ) : null}
    </div>
  )
}

interface LandDocumentGroupProps {
  land: LandSummary
  counts?: Record<DocumentStatus, number>
  countsLoading: boolean
  expanded: boolean
  onToggle: () => void
  onFocus: () => void
  onClearFocus?: () => void
  canUpload: boolean
  showUpload: boolean
  onToggleUpload: () => void
  canEditStages: boolean
  enableSendForSigning: boolean
  viewMode: 'list' | 'board'
  selectedIds: Set<string>
  highlightDocumentId: string | null
  drawerDocumentId: string | null
  expandedStages: Set<DocumentStatus>
  onToggleStage: (status: DocumentStatus) => void
  filterDocuments: (documents: Document[]) => Document[]
  paginate: ReturnType<typeof useDocumentWorkspace>['paginate']
  setPage: (landId: string, page: number) => void
  toggleSelected: (id: string) => void
  setAllSelected: (ids: string[], selected: boolean) => void
  setDrawerDocumentId: (id: string | null) => void
  onRequestStageMove: (document: Document, to: DocumentStatus) => void
  registerStageMover: (
    mover: (
      documentId: string,
      nextStatus: DocumentStatus,
      options?: { sellerId?: string | null },
    ) => Promise<Document>,
  ) => void
  onPreview: (document: Document, url: string) => void
  onPreviewError: (message: string) => void
  onUploadComplete: () => void
  onSigned?: () => void
  currentUserId: string | null
}

function LandDocumentGroup({
  land,
  counts,
  countsLoading,
  expanded,
  onToggle,
  onFocus,
  onClearFocus,
  canUpload,
  showUpload,
  onToggleUpload,
  canEditStages,
  enableSendForSigning,
  viewMode,
  selectedIds,
  highlightDocumentId,
  drawerDocumentId,
  expandedStages,
  onToggleStage,
  filterDocuments,
  paginate,
  setPage,
  toggleSelected,
  setAllSelected,
  setDrawerDocumentId,
  onRequestStageMove,
  registerStageMover,
  onPreview,
  onPreviewError,
  onUploadComplete,
  onSigned,
  currentUserId,
}: LandDocumentGroupProps) {
  const {
    documents,
    isLoading,
    error,
    setDocumentStage,
    downloadDocument,
    getPreviewUrl,
    signDocument,
  } = useDocuments(expanded ? land.id : null)

  const [pendingSign, setPendingSign] = useState<Document | null>(null)
  const [signError, setSignError] = useState<string | null>(null)
  const [isSigning, setIsSigning] = useState(false)

  useEffect(() => {
    if (expanded) {
      registerStageMover(setDocumentStage)
    }
  }, [expanded, registerStageMover, setDocumentStage])

  const filtered = filterDocuments(documents)
  const pageState = paginate(land.id, filtered)
  const drawerDocument =
    documents.find((doc) => doc.id === drawerDocumentId) ?? null

  const totalCount = counts
    ? counts.draft + counts.sent + counts.signed + counts.archived
    : documents.length
  const awaiting = counts?.sent ?? 0

  const canSignDrawer =
    drawerDocument?.status === 'sent' &&
    drawerDocument.assigned_to === currentUserId

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface-elevated">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:ring-2 focus-visible:ring-brand-600"
          aria-expanded={expanded}
          aria-controls={`land-docs-${land.id}`}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          )}
          <span className="truncate text-sm font-semibold text-ink">{land.title}</span>
          <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs text-muted">
            {countsLoading && !counts ? '…' : totalCount}
          </span>
          {awaiting > 0 ? (
            <span className="text-xs text-warning">{awaiting} awaiting signature</span>
          ) : null}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {onClearFocus ? (
            <Button type="button" size="sm" variant="ghost" onClick={onClearFocus}>
              All deals
            </Button>
          ) : (
            <Button type="button" size="sm" variant="ghost" onClick={onFocus}>
              Focus
            </Button>
          )}
          {canUpload ? (
            <IconActionButton
              label="Upload document"
              icon={<Upload className="h-4 w-4" />}
              variant="primary"
              onClick={onToggleUpload}
            />
          ) : null}
        </div>
      </div>

      <div
        id={`land-docs-${land.id}`}
        role="region"
        aria-label={`Documents for ${land.title}`}
        aria-hidden={!expanded}
        className={cn(!expanded && 'hidden')}
      >
        <div className="space-y-4 p-4">
          {land.location ? (
            <p className="inline-flex items-center gap-1 text-xs text-muted">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {land.location}
            </p>
          ) : null}

          {showUpload ? (
            <Card>
              <DocumentUpload landId={land.id} onUpload={onUploadComplete} />
            </Card>
          ) : null}

          {isLoading ? <p className="text-sm text-muted">Loading documents…</p> : null}

          {error ? (
            <p className="ui-alert-danger" role="alert">
              {formatSupabaseError(error as Error)}
            </p>
          ) : null}

          {!isLoading && !error && filtered.length === 0 ? (
            <EmptyState
              title="No documents in this deal"
              description="Upload a file or clear your search to see documents here."
            />
          ) : null}

          {!isLoading && !error && filtered.length > 0 && viewMode === 'list' ? (
            <div aria-hidden={viewMode !== 'list'}>
              <DocumentListView
                documents={pageState.items}
                selectedIds={selectedIds}
                canEditStages={canEditStages}
                page={pageState.page}
                totalPages={pageState.totalPages}
                total={pageState.total}
                highlightDocumentId={highlightDocumentId}
                onToggleSelect={toggleSelected}
                onSelectAll={(selected) =>
                  setAllSelected(
                    pageState.items.map((doc) => doc.id),
                    selected,
                  )
                }
                onRowOpen={(document) => setDrawerDocumentId(document.id)}
                onStageChange={onRequestStageMove}
                onPageChange={(page) => setPage(land.id, page)}
                hierarchical
                expandedStages={expandedStages}
                onToggleStage={onToggleStage}
              />
            </div>
          ) : null}

          {!isLoading && !error && filtered.length > 0 && viewMode === 'board' ? (
            <div aria-hidden={viewMode !== 'board'}>
              <DocumentBoard
                documents={filtered}
                canEditStages={canEditStages}
                highlightDocumentId={highlightDocumentId}
                onOpen={(document) => setDrawerDocumentId(document.id)}
                onStageChange={onRequestStageMove}
              />
            </div>
          ) : null}

          <DocumentDetailDrawer
            document={drawerDocument}
            landTitle={land.title}
            canEditStages={canEditStages}
            busy={isSigning}
            isSigning={isSigning}
            onClose={() => setDrawerDocumentId(null)}
            onStageChange={(status) => {
              if (drawerDocument) {
                onRequestStageMove(drawerDocument, status)
              }
            }}
            onPreview={() => {
              if (!drawerDocument) {
                return
              }
              void (async () => {
                try {
                  const url = await getPreviewUrl(drawerDocument)
                  onPreview(drawerDocument, url)
                } catch (err) {
                  onPreviewError(
                    err instanceof Error ? err.message : 'Could not preview.',
                  )
                }
              })()
            }}
            onDownload={() => {
              if (drawerDocument) {
                void downloadDocument(drawerDocument)
              }
            }}
            onSendForSigning={
              enableSendForSigning && drawerDocument?.status === 'draft'
                ? () => onRequestStageMove(drawerDocument, 'sent')
                : undefined
            }
            onSign={
              canSignDrawer && drawerDocument
                ? () => {
                    setSignError(null)
                    setPendingSign(drawerDocument)
                  }
                : undefined
            }
          />

          <ConfirmModal
            open={Boolean(pendingSign)}
            title="Sign this document?"
            description={
              pendingSign
                ? `${pendingSign.title ?? 'This document'} will be locked after signing.`
                : null
            }
            confirmLabel="Sign"
            busy={isSigning}
            error={signError}
            onCancel={() => {
              setPendingSign(null)
              setSignError(null)
            }}
            onConfirm={() => {
              if (!pendingSign) {
                return
              }
              void (async () => {
                setIsSigning(true)
                setSignError(null)
                try {
                  await signDocument(pendingSign.id)
                  setPendingSign(null)
                  setDrawerDocumentId(null)
                  onSigned?.()
                  notifyInfo('Document signed')
                } catch (err) {
                  setSignError(
                    err instanceof Error ? err.message : 'Could not sign document.',
                  )
                } finally {
                  setIsSigning(false)
                }
              })()
            }}
          />
        </div>
      </div>
    </section>
  )
}
