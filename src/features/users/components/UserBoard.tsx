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
import type { ManagedUser } from '@/features/users/useManagedUsers'
import {
  USER_ROLE_LABELS,
  USER_ROLE_ORDER,
  evaluateRoleChange,
} from '@/features/users/userRoles'
import type { UserRole } from '@/types'

interface UserBoardProps {
  users: ManagedUser[]
  currentUserId: string | null
  onOpen: (user: ManagedUser) => void
  onRoleChange: (user: ManagedUser, role: UserRole) => void
}

export function UserBoard({
  users,
  currentUserId,
  onOpen,
  onRoleChange,
}: UserBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const columns = useMemo(() => {
    const map: Record<UserRole, ManagedUser[]> = {
      admin: [],
      executive: [],
      agent: [],
      seller: [],
      community: [],
    }
    for (const user of users) {
      map[user.role].push(user)
    }
    return map
  }, [users])

  const activeUser = users.find((user) => user.id === activeId) ?? null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const userId = String(event.active.id)
    const user = users.find((item) => item.id === userId)
    if (!user) {
      return
    }

    const overId = event.over?.id
    if (!overId) {
      return
    }

    const overValue = String(overId)
    const targetRole = (
      USER_ROLE_ORDER.includes(overValue as UserRole)
        ? overValue
        : users.find((item) => item.id === overValue)?.role
    ) as UserRole | undefined

    if (!targetRole || targetRole === user.role) {
      return
    }

    const evaluation = evaluateRoleChange(user.role, targetRole, {
      isSelf: user.id === currentUserId,
    })
    if (evaluation.kind === 'blocked') {
      return
    }

    onRoleChange(user, targetRole)
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">
        Drag a card onto another role column to propose a role change.
      </p>

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
          aria-label="User role board"
        >
          {USER_ROLE_ORDER.map((role) => (
            <BoardColumn
              key={role}
              role={role}
              users={columns[role]}
              currentUserId={currentUserId}
              onOpen={onOpen}
            />
          ))}
        </div>

        <DragOverlay>
          {activeUser ? (
            <BoardCardFace user={activeUser} dragging highlighted={false} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function BoardColumn({
  role,
  users,
  currentUserId,
  onOpen,
}: {
  role: UserRole
  users: ManagedUser[]
  currentUserId: string | null
  onOpen: (user: ManagedUser) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: role })

  return (
    <section
      ref={setNodeRef}
      aria-label={`${USER_ROLE_LABELS[role]} column`}
      className={cn(
        'flex w-64 shrink-0 flex-col rounded-xl bg-surface transition',
        isOver && 'bg-hover',
      )}
    >
      <header className="flex items-center justify-between gap-3 px-3 py-2.5">
        <h3 className="text-[12px] font-medium text-ink">
          {USER_ROLE_LABELS[role]}
        </h3>
        <span className="text-[12px] text-muted tabular-nums">{users.length}</span>
      </header>

      <SortableContext
        items={users.map((user) => user.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-[12rem] flex-col gap-1.5 px-2 pb-2">
          {users.length === 0 ? (
            <p className="px-2 py-8 text-center text-[12px] text-muted">No users</p>
          ) : (
            users.map((user) => (
              <SortableBoardCard
                key={user.id}
                user={user}
                canDrag={user.id !== currentUserId}
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
  user,
  canDrag,
  onOpen,
}: {
  user: ManagedUser
  canDrag: boolean
  onOpen: (user: ManagedUser) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: user.id,
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
        onClick={() => onOpen(user)}
        aria-label={`Open ${user.email}`}
      >
        <BoardCardFace user={user} highlighted={false} dragging={false} />
      </button>
    </div>
  )
}

function BoardCardFace({
  user,
  highlighted,
  dragging,
}: {
  user: ManagedUser
  highlighted: boolean
  dragging: boolean
}) {
  return (
    <article
      className={cn(
        'rounded-lg border border-border bg-surface-elevated px-3 py-2.5 transition',
        'hover:border-muted/40',
        highlighted && 'border-muted/40',
        dragging && 'border-muted/40 shadow-sm',
        !user.is_active && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 line-clamp-1 text-[13px] font-medium text-ink">
          {user.full_name ?? 'Unnamed'}
        </p>
        <span
          className={cn(
            'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
            user.is_active ? 'bg-success' : 'bg-muted',
          )}
          aria-label={user.is_active ? 'Active' : 'Deactivated'}
          title={user.is_active ? 'Active' : 'Deactivated'}
        />
      </div>
      <p className="mt-0.5 line-clamp-1 text-[12px] text-muted">{user.email}</p>
    </article>
  )
}
