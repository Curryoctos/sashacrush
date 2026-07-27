import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import type { ManagedUser } from '@/features/users/useManagedUsers'
import { USER_ROLE_LABELS, USER_ROLE_ORDER } from '@/features/users/userRoles'
import type { UserRole } from '@/types'

interface UserDetailDrawerProps {
  user: ManagedUser | null
  currentUserId: string | null
  busy?: boolean
  onClose: () => void
  onRoleChange: (role: UserRole) => void
  onToggleActive: () => void
  onSendAccess: () => void
  onSaveName: (fullName: string) => void
}

function formatWhen(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function UserDetailDrawer({
  user,
  currentUserId,
  busy = false,
  onClose,
  onRoleChange,
  onToggleActive,
  onSendAccess,
  onSaveName,
}: UserDetailDrawerProps) {
  if (!user) {
    return null
  }

  const isSelf = user.id === currentUserId
  const title = user.full_name?.trim() || user.email

  return (
    <Drawer
      open
      title={title}
      description={user.email}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy || !user.is_active}
            onClick={onSendAccess}
          >
            {user.role === 'seller' ? 'Send magic link' : 'Send password reset'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={user.is_active ? 'danger' : 'primary'}
            disabled={busy || isSelf}
            onClick={onToggleActive}
          >
            {user.is_active ? 'Deactivate' : 'Reactivate'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Role
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {USER_ROLE_ORDER.map((role) => {
              const active = user.role === role
              return (
                <span
                  key={role}
                  className={
                    active
                      ? 'rounded-md bg-brand-700 px-2.5 py-1 text-xs font-medium text-white'
                      : 'rounded-md border border-border bg-white px-2.5 py-1 text-xs text-muted'
                  }
                >
                  {USER_ROLE_LABELS[role]}
                </span>
              )
            })}
          </div>
          <label className="mt-3 block">
            <span className="ui-label">Change role</span>
            <select
              className="ui-input mt-1"
              aria-label="Change user role"
              value={user.role}
              disabled={busy || isSelf}
              onChange={(event) => onRoleChange(event.target.value as UserRole)}
            >
              {USER_ROLE_ORDER.map((role) => (
                <option key={role} value={role}>
                  {USER_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Profile
          </h3>
          <label className="mt-3 block">
            <span className="ui-label">Full name</span>
            <input
              className="ui-input mt-1"
              defaultValue={user.full_name ?? ''}
              key={user.id + (user.full_name ?? '')}
              disabled={busy}
              onBlur={(event) => {
                const next = event.target.value.trim()
                if (next !== (user.full_name ?? '')) {
                  onSaveName(next)
                }
              }}
            />
          </label>
          <div className="mt-3">
            <Badge tone={statusTone(user.is_active ? 'active' : 'archived')}>
              {user.is_active ? 'Active' : 'Deactivated'}
            </Badge>
            {isSelf ? (
              <span className="ml-2 text-xs text-muted">This is your account</span>
            ) : null}
          </div>
        </section>

        <section className="space-y-2 text-sm">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Details
          </h3>
          <p>
            <span className="text-muted">Created · </span>
            {formatWhen(user.created_at)}
          </p>
          {user.updated_at ? (
            <p>
              <span className="text-muted">Updated · </span>
              {formatWhen(user.updated_at)}
            </p>
          ) : null}
        </section>
      </div>
    </Drawer>
  )
}
