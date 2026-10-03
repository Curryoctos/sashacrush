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
    <div className="space-y-4">
      {!canEditStages ? (
        <p className="text-[13px] text-muted">
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
          className="flex gap-4 overflow-x-auto pb-1"
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
        'flex w-64 shrink-0 flex-col rounded-xl bg-surface transition',
        isOver && canEditStages && 'bg-hover',
      )}
    >
      <header className="flex items-center justify-between gap-3 px-3 py-2.5">
        <h3 className="text-[12px] font-medium text-ink">
          {DOCUMENT_STAGE_LABELS[status]}
        </h3>
        <span className="text-[12px] text-muted tabular-nums">
          {documents.length}
        </span>
      </header>

      <SortableContext
        items={documents.map((doc) => doc.id)}
        strategy={verticalListSortingStrategy}
        disabled={!canEditStages}
      >
        <div className="flex min-h-[12rem] flex-col gap-1.5 px-2 pb-2">
          {documents.length === 0 ? (
            <p className="px-2 py-8 text-center text-[12px] text-muted">
              No documents
            </p>
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
        className="w-full text-left focus-visible:ring-2 focus-visible:ring-ink/20"
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
  const when = new Date(document.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  return (
    <article
      className={cn(
        'rounded-lg border border-border bg-surface-elevated px-3 py-2.5 transition',
        'hover:border-muted/40',
        highlighted && 'border-muted/40',
        dragging && 'border-muted/40 shadow-sm',
      )}
    >
      <p className="line-clamp-2 text-[13px] font-medium text-ink">{title}</p>
      <p className="mt-1 text-[12px] text-muted">{when}</p>
    </article>
  )
}
