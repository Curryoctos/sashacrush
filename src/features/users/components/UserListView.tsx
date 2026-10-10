import { type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import type { ManagedUser } from '@/features/users/useManagedUsers'
import {
  USER_ROLE_LABELS,
  USER_ROLE_ORDER,
} from '@/features/users/userRoles'
import type { UserRole } from '@/types'

interface UserListViewProps {
  users: ManagedUser[]
  selectedIds: Set<string>
  currentUserId: string | null
  page: number
  totalPages: number
  total: number
  expandedRoles: Set<UserRole>
  onToggleRole: (role: UserRole) => void
  onToggleSelect: (id: string) => void
  onSelectAll: (selected: boolean) => void
  onRowOpen: (user: ManagedUser) => void
  onRoleChange: (user: ManagedUser, role: UserRole) => void
  onPageChange: (page: number) => void
}

function formatWhen(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function UserListView({
  users,
  selectedIds,
  currentUserId,
  page,
  totalPages,
  total,
  expandedRoles,
  onToggleRole,
  onToggleSelect,
  onSelectAll,
  onRowOpen,
  onRoleChange,
  onPageChange,
}: UserListViewProps) {
  const visibleIds = users.map((user) => user.id)
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someSelected = visibleIds.some((id) => selectedIds.has(id))

  const groups = USER_ROLE_ORDER.map((role) => ({
    role,
    items: users.filter((user) => user.role === role),
  })).filter((group) => group.items.length > 0)

  const renderRow = (user: ManagedUser) => {
    const isSelf = user.id === currentUserId
    const name = user.full_name ?? '—'

    return (
      <tr
        key={user.id}
        className={cn(
          'cursor-pointer transition hover:bg-surface',
          selectedIds.has(user.id) && 'bg-surface',
        )}
        onClick={() => onRowOpen(user)}
      >
        <td className="w-10" onClick={(event) => event.stopPropagation()}>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border text-ink focus-visible:ring-2 focus-visible:ring-ink/20"
            checked={selectedIds.has(user.id)}
            disabled={isSelf}
            aria-label={`Select ${user.email}`}
            onChange={() => onToggleSelect(user.id)}
          />
        </td>
        <td className="font-medium text-ink">
          <span className="line-clamp-1">
            {name}
            {isSelf ? <span className="ml-2 text-xs text-muted">(you)</span> : null}
          </span>
        </td>
        <td className="text-muted">{user.email}</td>
        <td onClick={(event) => event.stopPropagation()}>
          <select
            className="ui-input max-w-[12rem] py-1.5 text-xs"
            aria-label={`Role for ${user.email}`}
            value={user.role}
            disabled={isSelf}
            onChange={(event) =>
              onRoleChange(user, event.target.value as UserRole)
            }
          >
            {USER_ROLE_ORDER.map((role) => (
              <option key={role} value={role}>
                {USER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </td>
        <td>
          <Badge tone={statusTone(user.is_active ? 'active' : 'archived')}>
            {user.is_active ? 'Active' : 'Deactivated'}
          </Badge>
        </td>
        <td className="whitespace-nowrap text-muted">{formatWhen(user.created_at)}</td>
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
                  aria-label="Select all users on this page"
                  onChange={(event) => onSelectAll(event.target.checked)}
                />
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th className="w-12 text-right">#</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const open = expandedRoles.has(group.role)
              return (
                <RoleGroupRows
                  key={group.role}
                  role={group.role}
                  count={group.items.length}
                  open={open}
                  onToggle={() => onToggleRole(group.role)}
                >
                  {open ? group.items.map(renderRow) : null}
                </RoleGroupRows>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <p>
          {total === 0
            ? 'No users'
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

function RoleGroupRows({
  role,
  count,
  open,
  onToggle,
  children,
}: {
  role: UserRole
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
        aria-label={`${open ? 'Collapse' : 'Expand'} ${USER_ROLE_LABELS[role]}`}
      >
        <td colSpan={6} className="!py-2.5">
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
            {USER_ROLE_LABELS[role]}
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
