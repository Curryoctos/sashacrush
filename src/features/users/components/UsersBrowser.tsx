import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EmptyState } from '@/components/ui/PageHeader'
import { ViewModeToggle } from '@/components/ui/ViewModeToggle'
import { UserBoard } from '@/features/users/components/UserBoard'
import { UserDetailDrawer } from '@/features/users/components/UserDetailDrawer'
import { UserListView } from '@/features/users/components/UserListView'
import {
  useCreateUser,
  useManagedUsers,
  useSendUserAccess,
  useSetUserActive,
  useUpdateUser,
  type ManagedUser,
} from '@/features/users/useManagedUsers'
import { useUserWorkspace, type StatusFilter } from '@/features/users/useUserWorkspace'
import {
  USER_ROLE_LABELS,
  USER_ROLE_ORDER,
  evaluateDeactivate,
  evaluateRoleChange,
} from '@/features/users/userRoles'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'
import type { UserRole } from '@/types'

type PendingAction =
  | {
      kind: 'role'
      user: ManagedUser
      role: UserRole
      reason: string
      confirmLabel: string
      tone: 'danger' | 'primary'
    }
  | {
      kind: 'active'
      user: ManagedUser
      isActive: boolean
      reason: string
      confirmLabel: string
      tone: 'danger' | 'primary'
    }
  | {
      kind: 'bulk_active'
      userIds: string[]
      isActive: boolean
      reason: string
      confirmLabel: string
      tone: 'danger' | 'primary'
    }

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'deactivated', label: 'Deactivated' },
]

export function UsersBrowser() {
  const { user: currentUser } = useAuth()
  const workspace = useUserWorkspace()
  const usersQuery = useManagedUsers('all')
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const setActive = useSetUserActive()
  const sendAccess = useSendUserAccess()

  const [showCreate, setShowCreate] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createName, setCreateName] = useState('')
  const [createRole, setCreateRole] = useState<UserRole>('seller')
  const [sendInvite, setSendInvite] = useState(true)
  const [flash, setFlash] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const busy =
    createUser.isPending ||
    updateUser.isPending ||
    setActive.isPending ||
    sendAccess.isPending ||
    confirmBusy

  const filtered = useMemo(
    () => workspace.filterUsers(usersQuery.data ?? []),
    [usersQuery.data, workspace.filterUsers],
  )
  const pageState = workspace.paginate(filtered)
  const drawerUser =
    (usersQuery.data ?? []).find((user) => user.id === workspace.drawerUserId) ??
    null

  const requestRoleChange = (user: ManagedUser, role: UserRole) => {
    const evaluation = evaluateRoleChange(user.role, role, {
      isSelf: user.id === currentUser?.id,
    })
    if (evaluation.kind === 'blocked') {
      setActionError(evaluation.reason)
      return
    }
    if (evaluation.kind === 'allowed') {
      return
    }
    setActionError(null)
    setPending({
      kind: 'role',
      user,
      role,
      reason: evaluation.reason,
      confirmLabel: evaluation.confirmLabel,
      tone: evaluation.tone ?? 'primary',
    })
  }

  const requestToggleActive = (user: ManagedUser) => {
    const evaluation = evaluateDeactivate({
      isSelf: user.id === currentUser?.id,
      isActive: user.is_active,
    })
    if (evaluation.kind === 'blocked') {
      setActionError(evaluation.reason)
      return
    }
    if (evaluation.kind === 'allowed') {
      return
    }
    setActionError(null)
    setPending({
      kind: 'active',
      user,
      isActive: !user.is_active,
      reason: evaluation.reason,
      confirmLabel: evaluation.confirmLabel,
      tone: evaluation.tone ?? 'primary',
    })
  }

  const requestBulkDeactivate = (isActive: boolean) => {
    const ids = [...workspace.selectedIds].filter((id) => id !== currentUser?.id)
    if (ids.length === 0) {
      setActionError('Select at least one other user.')
      return
    }
    setActionError(null)
    setPending({
      kind: 'bulk_active',
      userIds: ids,
      isActive,
      reason: isActive
        ? `Reactivate ${ids.length} selected account${ids.length === 1 ? '' : 's'}?`
        : `Deactivate ${ids.length} selected account${ids.length === 1 ? '' : 's'}?`,
      confirmLabel: isActive ? 'Reactivate selected' : 'Deactivate selected',
      tone: isActive ? 'primary' : 'danger',
    })
  }

  const confirmPending = async () => {
    if (!pending) {
      return
    }
    setConfirmBusy(true)
    setActionError(null)
    try {
      if (pending.kind === 'role') {
        await updateUser.mutateAsync({
          userId: pending.user.id,
          role: pending.role,
        })
        setFlash(`Role updated to ${USER_ROLE_LABELS[pending.role]}.`)
      } else if (pending.kind === 'active') {
        await setActive.mutateAsync({
          userId: pending.user.id,
          isActive: pending.isActive,
        })
        setFlash(pending.isActive ? 'User reactivated.' : 'User deactivated.')
      } else {
        for (const userId of pending.userIds) {
          await setActive.mutateAsync({
            userId,
            isActive: pending.isActive,
          })
        }
        workspace.clearSelection()
        setFlash(
          pending.isActive
            ? `Reactivated ${pending.userIds.length} user(s).`
            : `Deactivated ${pending.userIds.length} user(s).`,
        )
      }
      setPending(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setConfirmBusy(false)
    }
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setActionError(null)
    setFlash(null)
    try {
      await createUser.mutateAsync({
        email: createEmail,
        fullName: createName || undefined,
        role: createRole,
        sendInvite,
      })
      setCreateEmail('')
      setCreateName('')
      setCreateRole('seller')
      setSendInvite(true)
      setShowCreate(false)
      setFlash(
        sendInvite
          ? 'User created and access email sent.'
          : 'User created. Send access when ready.',
      )
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create user.')
    }
  }

  if (usersQuery.isLoading) {
    return <p className="text-sm text-muted">Loading users…</p>
  }

  if (usersQuery.error) {
    return (
      <p className="ui-alert-danger" role="alert">
        {formatSupabaseError(usersQuery.error as Error)}
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block min-w-[14rem] flex-1">
          <span className="ui-label">Search users</span>
          <input
            className="ui-input mt-1"
            type="search"
            value={workspace.search}
            onChange={(event) => {
              workspace.setSearch(event.target.value)
              workspace.setPage(1)
            }}
            placeholder="Name, email, or role…"
            aria-label="Search users"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <ViewModeToggle value={workspace.viewMode} onChange={workspace.setViewMode} />
          <Button type="button" onClick={() => setShowCreate((open) => !open)}>
            {showCreate ? 'Close' : 'Create user'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Status filter">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            size="sm"
            variant={workspace.statusFilter === filter.value ? 'primary' : 'secondary'}
            aria-pressed={workspace.statusFilter === filter.value}
            onClick={() => workspace.setStatusFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {flash ? (
        <p className="ui-alert-success" role="status">
          {flash}
        </p>
      ) : null}
      {actionError && !pending ? (
        <p className="ui-alert-danger" role="alert">
          {actionError}
        </p>
      ) : null}

      {showCreate ? (
        <Card>
          <h2 className="mb-3 text-base font-semibold text-ink">Create user</h2>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void handleCreate(e)}>
            <label className="block sm:col-span-2">
              <span className="ui-label">Email</span>
              <input
                className="ui-input mt-1"
                type="email"
                required
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="block">
              <span className="ui-label">Full name</span>
              <input
                className="ui-input mt-1"
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="block">
              <span className="ui-label">Role</span>
              <select
                className="ui-input mt-1"
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value as UserRole)}
              >
                {USER_ROLE_ORDER.map((role) => (
                  <option key={role} value={role}>
                    {USER_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
              <input
                type="checkbox"
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
              />
              Send access email now
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {createUser.isPending ? 'Creating…' : 'Create user'}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {workspace.selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <p className="text-sm text-ink">
            {workspace.selectedCount} selected
          </p>
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => requestBulkDeactivate(false)}
          >
            Deactivate selected
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => requestBulkDeactivate(true)}
          >
            Reactivate selected
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={workspace.clearSelection}
          >
            Clear selection
          </Button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title="No users match this view"
          description="Adjust search or status filters, or create a new user."
        />
      ) : null}

      {filtered.length > 0 && workspace.viewMode === 'list' ? (
        <div aria-hidden={false}>
          <UserListView
            users={pageState.items}
            selectedIds={workspace.selectedIds}
            currentUserId={currentUser?.id ?? null}
            page={pageState.page}
            totalPages={pageState.totalPages}
            total={pageState.total}
            expandedRoles={workspace.expandedRoles}
            onToggleRole={workspace.toggleRoleExpanded}
            onToggleSelect={workspace.toggleSelected}
            onSelectAll={(selected) =>
              workspace.setAllSelected(
                pageState.items
                  .filter((user) => user.id !== currentUser?.id)
                  .map((user) => user.id),
                selected,
              )
            }
            onRowOpen={(user) => workspace.setDrawerUserId(user.id)}
            onRoleChange={requestRoleChange}
            onPageChange={workspace.setPage}
          />
        </div>
      ) : null}

      {filtered.length > 0 && workspace.viewMode === 'board' ? (
        <div aria-hidden={false}>
          <UserBoard
            users={filtered}
            currentUserId={currentUser?.id ?? null}
            onOpen={(user) => workspace.setDrawerUserId(user.id)}
            onRoleChange={requestRoleChange}
          />
        </div>
      ) : null}

      <UserDetailDrawer
        user={drawerUser}
        currentUserId={currentUser?.id ?? null}
        busy={busy}
        onClose={() => workspace.setDrawerUserId(null)}
        onRoleChange={(role) => {
          if (drawerUser) {
            requestRoleChange(drawerUser, role)
          }
        }}
        onToggleActive={() => {
          if (drawerUser) {
            requestToggleActive(drawerUser)
          }
        }}
        onSendAccess={() => {
          if (!drawerUser) {
            return
          }
          void (async () => {
            setActionError(null)
            setFlash(null)
            try {
              await sendAccess.mutateAsync(drawerUser.id)
              setFlash(
                drawerUser.role === 'seller'
                  ? 'Magic link emailed.'
                  : 'Password reset link emailed.',
              )
            } catch (err) {
              setActionError(
                err instanceof Error ? err.message : 'Could not send access email.',
              )
            }
          })()
        }}
        onSaveName={(fullName) => {
          if (!drawerUser) {
            return
          }
          void (async () => {
            setActionError(null)
            try {
              await updateUser.mutateAsync({
                userId: drawerUser.id,
                fullName,
              })
              setFlash('Name updated.')
            } catch (err) {
              setActionError(
                err instanceof Error ? err.message : 'Could not update name.',
              )
            }
          })()
        }}
      />

      <ConfirmModal
        open={Boolean(pending)}
        title={
          pending?.kind === 'role'
            ? `Change role to ${USER_ROLE_LABELS[pending.role]}`
            : pending?.confirmLabel ?? 'Confirm'
        }
        description={pending?.reason}
        confirmLabel={pending?.confirmLabel}
        tone={pending?.tone}
        busy={confirmBusy}
        error={actionError}
        onCancel={() => {
          setPending(null)
          setActionError(null)
        }}
        onConfirm={() => void confirmPending()}
      />
    </div>
  )
}
