import { type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import {
  DOCUMENT_PIPELINE_ORDER,
  DOCUMENT_STAGE_LABELS,
  allowedStageTargets,
} from '@/features/documents/documentStages'
import type { Document, DocumentStatus } from '@/types'

interface DocumentListViewProps {
  documents: Document[]
  selectedIds: Set<string>
  canEditStages: boolean
  page: number
  totalPages: number
  total: number
  highlightDocumentId?: string | null
  onToggleSelect: (id: string) => void
  onSelectAll: (selected: boolean) => void
  onRowOpen: (document: Document) => void
  onStageChange: (document: Document, status: DocumentStatus) => void
  onPageChange: (page: number) => void
  /** When true, nest rows under expandable stage groups. */
  hierarchical?: boolean
  expandedStages?: Set<DocumentStatus>
  onToggleStage?: (status: DocumentStatus) => void
}

function formatWhen(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function DocumentListView({
  documents,
  selectedIds,
  canEditStages,
  page,
  totalPages,
  total,
  highlightDocumentId = null,
  onToggleSelect,
  onSelectAll,
  onRowOpen,
  onStageChange,
  onPageChange,
  hierarchical = true,
  expandedStages,
  onToggleStage,
}: DocumentListViewProps) {
  const visibleIds = documents.map((doc) => doc.id)
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someSelected = visibleIds.some((id) => selectedIds.has(id))

  const stageGroups = DOCUMENT_PIPELINE_ORDER.map((status) => ({
    status,
    items: documents.filter((doc) => doc.status === status),
  })).filter((group) => group.items.length > 0)

  const renderRow = (document: Document) => {
    const title = document.title ?? document.file_path ?? 'Untitled document'
    const targets = allowedStageTargets(document.status)
    const highlighted = highlightDocumentId === document.id

    return (
      <tr
        key={document.id}
        className={cn(
          'cursor-pointer transition hover:bg-surface',
          highlighted && 'bg-surface',
          selectedIds.has(document.id) && 'bg-surface',
        )}
        onClick={() => onRowOpen(document)}
      >
        <td className="w-10" onClick={(event) => event.stopPropagation()}>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border text-ink focus-visible:ring-2 focus-visible:ring-ink/20"
            checked={selectedIds.has(document.id)}
            aria-label={`Select ${title}`}
            onChange={() => onToggleSelect(document.id)}
          />
        </td>
        <td className="font-medium text-ink">
          <span className="line-clamp-1">{title}</span>
        </td>
        <td onClick={(event) => event.stopPropagation()}>
          {canEditStages ? (
            <select
              className="ui-input max-w-[11rem] py-1.5 text-xs"
              aria-label={`Stage for ${title}`}
              value={document.status}
              onChange={(event) =>
                onStageChange(document, event.target.value as DocumentStatus)
              }
            >
              {targets.map((status) => (
                <option key={status} value={status}>
                  {DOCUMENT_STAGE_LABELS[status]}
                </option>
              ))}
            </select>
          ) : (
            <Badge tone={statusTone(document.status)}>
              {DOCUMENT_STAGE_LABELS[document.status]}
            </Badge>
          )}
        </td>
        <td className="text-muted">{formatWhen(document.created_at)}</td>
        <td className="w-12" aria-hidden />
      </tr>
    )
  }

  return (
    <div className="space-y-3">
      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-ink focus-visible:ring-2 focus-visible:ring-ink/20"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = someSelected && !allSelected
                    }
                  }}
                  aria-label="Select all documents on this page"
                  onChange={(event) => onSelectAll(event.target.checked)}
                />
              </th>
              <th>Document</th>
              <th>Stage</th>
              <th>Uploaded</th>
              <th className="w-12 text-right">#</th>
            </tr>
          </thead>
          <tbody>
            {hierarchical
              ? stageGroups.map((group) => {
                  const open = expandedStages?.has(group.status) ?? false
                  return (
                    <StageGroupRows
                      key={group.status}
                      status={group.status}
                      count={group.items.length}
                      open={open}
                      onToggle={() => onToggleStage?.(group.status)}
                    >
                      {open ? group.items.map(renderRow) : null}
                    </StageGroupRows>
                  )
                })
              : documents.map(renderRow)}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <p>
          {total === 0
            ? 'No documents'
            : `Showing page ${page} of ${totalPages} · ${total} total`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            aria-label="Previous page"
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={page >= totalPages}
            aria-label="Next page"
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

function StageGroupRows({
  status,
  count,
  open,
  onToggle,
  children,
}: {
  status: DocumentStatus
  count: number
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <>
      <tr
        className="group cursor-pointer bg-surface transition hover:bg-hover"
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onToggle()
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} ${DOCUMENT_STAGE_LABELS[status]}`}
      >
        <td colSpan={4} className="!py-2.5">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            {open ? (
              <ChevronDown
                className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-y-0.5"
                aria-hidden
              />
            ) : (
              <ChevronRight
                className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                aria-hidden
              />
            )}
            {DOCUMENT_STAGE_LABELS[status]}
          </span>
        </td>
        <td className="!py-2.5 text-right text-[12px] text-muted tabular-nums">
          {count}
        </td>
      </tr>
      {children}
    </>
  )
}
