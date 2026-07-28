import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { WorkspaceViewMode } from '@/components/ui/ViewModeToggle'
import type { ManagedUser } from '@/features/users/useManagedUsers'
import { USER_ROLE_ORDER } from '@/features/users/userRoles'
import type { UserRole } from '@/types'

const PAGE_SIZE = 10
const GROUPS_PARAM = 'groups'

export type StatusFilter = 'all' | 'active' | 'deactivated'

function isUserRole(value: string): value is UserRole {
  return (USER_ROLE_ORDER as readonly string[]).includes(value)
}

/** Parse `?groups=admin,seller`. Missing/empty → all closed. */
function parseExpandedRoles(raw: string | null): Set<UserRole> {
  if (!raw || raw.trim() === '') {
    return new Set()
  }
  const next = new Set<UserRole>()
  for (const part of raw.split(',')) {
    const role = part.trim()
    if (isUserRole(role)) {
      next.add(role)
    }
  }
  return next
}

function serializeExpandedRoles(roles: Set<UserRole>): string {
  return USER_ROLE_ORDER.filter((role) => roles.has(role)).join(',')
}

export function useUserWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null)

  const rawView = searchParams.get('view')
  const viewMode: WorkspaceViewMode =
    rawView === 'board' || rawView === 'kanban' ? 'board' : 'list'

  // Default closed on first open; URL keeps open groups across list/board/nav.
  const expandedRoles = useMemo(
    () => parseExpandedRoles(searchParams.get(GROUPS_PARAM)),
    [searchParams],
  )

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

  const toggleRoleExpanded = useCallback(
    (role: UserRole) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const current = parseExpandedRoles(next.get(GROUPS_PARAM))
          if (current.has(role)) {
            current.delete(role)
          } else {
            current.add(role)
          }
          const serialized = serializeExpandedRoles(current)
          if (serialized) {
            next.set(GROUPS_PARAM, serialized)
          } else {
            next.delete(GROUPS_PARAM)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const filterUsers = useCallback(
    (users: ManagedUser[]) => {
      const query = search.trim().toLowerCase()
      return users.filter((user) => {
        if (statusFilter === 'active' && !user.is_active) {
          return false
        }
        if (statusFilter === 'deactivated' && user.is_active) {
          return false
        }
        if (!query) {
          return true
        }
        const haystack = `${user.full_name ?? ''} ${user.email} ${user.role}`.toLowerCase()
        return haystack.includes(query)
      })
    },
    [search, statusFilter],
  )

  const paginate = useCallback(
    (users: ManagedUser[]) => {
      const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE))
      const safePage = Math.min(page, totalPages)
      const start = (safePage - 1) * PAGE_SIZE
      return {
        page: safePage,
        totalPages,
        total: users.length,
        pageSize: PAGE_SIZE,
        items: users.slice(start, start + PAGE_SIZE),
      }
    },
    [page],
  )

  const groupByRole = useCallback((users: ManagedUser[]) => {
    const groups: Record<UserRole, ManagedUser[]> = {
      admin: [],
      executive: [],
      agent: [],
      seller: [],
    }
    for (const user of users) {
      groups[user.role].push(user)
    }
    return USER_ROLE_ORDER.map((role) => ({
      role,
      items: groups[role],
    }))
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

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds])

  return {
    viewMode,
    setViewMode,
    search,
    setSearch,
    statusFilter,
    setStatusFilter: (value: StatusFilter) => {
      setStatusFilter(value)
      setPage(1)
    },
    selectedIds,
    selectedCount,
    toggleSelected,
    setAllSelected,
    clearSelection,
    drawerUserId,
    setDrawerUserId,
    expandedRoles,
    toggleRoleExpanded,
    filterUsers,
    paginate,
    setPage,
    groupByRole,
    pageSize: PAGE_SIZE,
  }
}
