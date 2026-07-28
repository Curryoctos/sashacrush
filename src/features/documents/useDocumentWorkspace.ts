import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { WorkspaceViewMode } from '@/components/ui/ViewModeToggle'
import { DOCUMENT_PIPELINE_ORDER } from '@/features/documents/documentStages'
import type { Document, DocumentStatus, LandRecord } from '@/types'

export type LandSummary = Pick<LandRecord, 'id' | 'title'> &
  Partial<Pick<LandRecord, 'location' | 'seller_id'>>

const PAGE_SIZE = 10
const STAGES_PARAM = 'stages'

function isDocumentStatus(value: string): value is DocumentStatus {
  return (DOCUMENT_PIPELINE_ORDER as readonly string[]).includes(value)
}

/** Parse `?stages=draft,sent`. Missing/empty → all stage groups closed. */
function parseExpandedStages(raw: string | null): Set<DocumentStatus> {
  if (!raw || raw.trim() === '') {
    return new Set()
  }
  const next = new Set<DocumentStatus>()
  for (const part of raw.split(',')) {
    const status = part.trim()
    if (isDocumentStatus(status)) {
      next.add(status)
    }
  }
  return next
}

function serializeExpandedStages(stages: Set<DocumentStatus>): string {
  return DOCUMENT_PIPELINE_ORDER.filter((status) => stages.has(status)).join(',')
}

export function useDocumentWorkspace(lands: LandSummary[]) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pageByLand, setPageByLand] = useState<Record<string, number>>({})
  const [drawerDocumentId, setDrawerDocumentId] = useState<string | null>(null)
  const [expandedLandIds, setExpandedLandIds] = useState<Set<string>>(() => {
    const land = searchParams.get('land')
    return land ? new Set([land]) : new Set()
  })

  const rawView = searchParams.get('view')
  const viewMode: WorkspaceViewMode =
    rawView === 'board' || rawView === 'kanban' ? 'board' : 'list'

  // Default closed on first open; URL keeps open stage groups across nav.
  const expandedStages = useMemo(
    () => parseExpandedStages(searchParams.get(STAGES_PARAM)),
    [searchParams],
  )

  const focusedLandId = useMemo(() => {
    const landFromQuery = searchParams.get('land')
    if (landFromQuery && lands.some((land) => land.id === landFromQuery)) {
      return landFromQuery
    }
    return null
  }, [searchParams, lands])

  const setViewMode = useCallback(
    (mode: WorkspaceViewMode) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('view', mode)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const toggleStageExpanded = useCallback(
    (status: DocumentStatus) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const current = parseExpandedStages(next.get(STAGES_PARAM))
          if (current.has(status)) {
            current.delete(status)
          } else {
            current.add(status)
          }
          const serialized = serializeExpandedStages(current)
          if (serialized) {
            next.set(STAGES_PARAM, serialized)
          } else {
            next.delete(STAGES_PARAM)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const focusLand = useCallback(
    (landId: string | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (landId) {
          next.set('land', landId)
        } else {
          next.delete('land')
        }
        next.delete('folder')
        return next
      })
      if (landId) {
        setExpandedLandIds((prev) => new Set(prev).add(landId))
      }
    },
    [setSearchParams],
  )

  const toggleLandExpanded = useCallback((landId: string) => {
    setExpandedLandIds((prev) => {
      const next = new Set(prev)
      if (next.has(landId)) {
        next.delete(landId)
      } else {
        next.add(landId)
      }
      return next
    })
  }, [])

  const filterDocuments = useCallback(
    (documents: Document[]) => {
      const query = search.trim().toLowerCase()
      if (!query) {
        return documents
      }
      return documents.filter((doc) => {
        const title = (doc.title ?? doc.file_path ?? '').toLowerCase()
        return title.includes(query) || doc.status.includes(query)
      })
    },
    [search],
  )

  const paginate = useCallback(
    (landId: string, documents: Document[]) => {
      const page = pageByLand[landId] ?? 1
      const totalPages = Math.max(1, Math.ceil(documents.length / PAGE_SIZE))
      const safePage = Math.min(page, totalPages)
      const start = (safePage - 1) * PAGE_SIZE
      return {
        page: safePage,
        totalPages,
        total: documents.length,
        pageSize: PAGE_SIZE,
        items: documents.slice(start, start + PAGE_SIZE),
      }
    },
    [pageByLand],
  )

  const setPage = useCallback((landId: string, page: number) => {
    setPageByLand((prev) => ({ ...prev, [landId]: page }))
  }, [])

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const setAllSelected = useCallback((ids: string[], selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (selected) {
          next.add(id)
        } else {
          next.delete(id)
        }
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const groupByStage = useCallback((documents: Document[]) => {
    const groups: Record<DocumentStatus, Document[]> = {
      draft: [],
      sent: [],
      signed: [],
      archived: [],
    }
    for (const doc of documents) {
      groups[doc.status].push(doc)
    }
    return groups
  }, [])

  return {
    viewMode,
    setViewMode,
    search,
    setSearch,
    focusedLandId,
    focusLand,
    expandedLandIds,
    toggleLandExpanded,
    expandedStages,
    toggleStageExpanded,
    selectedIds,
    toggleSelected,
    setAllSelected,
    clearSelection,
    drawerDocumentId,
    setDrawerDocumentId,
    filterDocuments,
    paginate,
    setPage,
    groupByStage,
    pageSize: PAGE_SIZE,
  }
}
