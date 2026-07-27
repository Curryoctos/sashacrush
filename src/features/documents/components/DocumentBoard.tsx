import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge, statusTone } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import {
  DOCUMENT_PIPELINE_ORDER,
  DOCUMENT_STAGE_LABELS,
  evaluateDocumentStageMove,
} from '@/features/documents/documentStages'
import type { Document, DocumentStatus } from '@/types'

interface DocumentBoardProps {
  documents: Document[]
  canEditStages: boolean
  highlightDocumentId?: string | null
  onOpen: (document: Document) => void
  onStageChange: (document: Document, status: DocumentStatus) => void
}

export function DocumentBoard({
  documents,
  canEditStages,
  highlightDocumentId = null,
  onOpen,
  onStageChange,
}: DocumentBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const columns = useMemo(() => {
    const map: Record<DocumentStatus, Document[]> = {
      draft: [],
      sent: [],
      signed: [],
      archived: [],
    }
    for (const doc of documents) {
      map[doc.status].push(doc)
    }
    return map
  }, [documents])

  const activeDocument = documents.find((doc) => doc.id === activeId) ?? null

  const handleDragStart = (event: DragStartEvent) => {
    if (!canEditStages) {
      return
    }
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    if (!canEditStages) {
      return
    }

    const documentId = String(event.active.id)
    const document = documents.find((doc) => doc.id === documentId)
    if (!document) {
      return
    }

    const overId = event.over?.id
    if (!overId) {
      return
    }

    const overValue = String(overId)
    const targetStatus = (
      DOCUMENT_PIPELINE_ORDER.includes(overValue as DocumentStatus)
        ? overValue
        : documents.find((doc) => doc.id === overValue)?.status
    ) as DocumentStatus | undefined

    if (!targetStatus || targetStatus === document.status) {
      return
    }

    const evaluation = evaluateDocumentStageMove(document.status, targetStatus)
    if (evaluation.kind === 'blocked') {
      return
    }

    onStageChange(document, targetStatus)
  }

  return (
    <div className="space-y-3">
      {!canEditStages ? (
        <p className="ui-alert-info" role="note">
          Board is read-only for your role. Open a card to review details.
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          role="region"
          aria-label="Document stage board"
        >
          {DOCUMENT_PIPELINE_ORDER.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              documents={columns[status]}
              canEditStages={canEditStages}
              highlightDocumentId={highlightDocumentId}
              onOpen={onOpen}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDocument ? (
            <BoardCardFace
              document={activeDocument}
              dragging
              highlighted={false}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function BoardColumn({
  status,
  documents,
  canEditStages,
  highlightDocumentId,
  onOpen,
}: {
  status: DocumentStatus
  documents: Document[]
  canEditStages: boolean
  highlightDocumentId: string | null
  onOpen: (document: Document) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <section
      ref={setNodeRef}
      aria-label={`${DOCUMENT_STAGE_LABELS[status]} column`}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border border-border bg-surface',
        isOver && canEditStages && 'border-brand-400 bg-brand-50/40',
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {DOCUMENT_STAGE_LABELS[status]}
        </h3>
        <span className="rounded-md bg-white px-1.5 py-0.5 text-xs font-medium text-ink">
          {documents.length}
        </span>
      </header>

      <SortableContext
        items={documents.map((doc) => doc.id)}
        strategy={verticalListSortingStrategy}
        disabled={!canEditStages}
      >
        <div className="flex min-h-[12rem] flex-col gap-2 p-2">
          {documents.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted">No documents</p>
          ) : (
            documents.map((document) => (
              <SortableBoardCard
                key={document.id}
                document={document}
                canDrag={canEditStages && document.status !== 'signed'}
                highlighted={highlightDocumentId === document.id}
                onOpen={onOpen}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  )
}

function SortableBoardCard({
  document,
  canDrag,
  highlighted,
  onOpen,
}: {
  document: Document
  canDrag: boolean
  highlighted: boolean
  onOpen: (document: Document) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: document.id,
      disabled: !canDrag,
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'opacity-40')}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        className="w-full text-left focus-visible:ring-2 focus-visible:ring-brand-600"
        onClick={() => onOpen(document)}
        aria-label={`Open ${document.title ?? 'document'}`}
      >
        <BoardCardFace
          document={document}
          highlighted={highlighted}
          dragging={false}
        />
      </button>
    </div>
  )
}

function BoardCardFace({
  document,
  highlighted,
  dragging,
}: {
  document: Document
  highlighted: boolean
  dragging: boolean
}) {
  const title = document.title ?? document.file_path ?? 'Untitled document'

  return (
    <article
      className={cn(
        'rounded-md border border-border bg-surface-elevated p-3 shadow-sm',
        highlighted && 'border-brand-400 ring-1 ring-brand-300',
        dragging && 'shadow-lg ring-2 ring-brand-500',
      )}
    >
      <p className="line-clamp-2 text-sm font-medium text-ink">{title}</p>
      <div className="mt-2">
        <Badge tone={statusTone(document.status)}>
          {DOCUMENT_STAGE_LABELS[document.status]}
        </Badge>
      </div>
    </article>
  )
}
