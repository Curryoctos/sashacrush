import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/cn'

export type WorkspaceViewMode = 'list' | 'board'

interface ViewModeToggleProps {
  value: WorkspaceViewMode
  onChange: (mode: WorkspaceViewMode) => void
  className?: string
}

export function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  return (
    <div
      role="group"
      aria-label="View mode"
      className={cn('inline-flex rounded-lg border border-border bg-surface p-0.5', className)}
    >
      <button
        type="button"
        aria-label="List view"
        aria-pressed={value === 'list'}
        onClick={() => onChange('list')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition',
          'focus-visible:ring-2 focus-visible:ring-ink/20',
          value === 'list'
            ? 'bg-surface-elevated text-ink'
            : 'text-muted hover:text-ink',
        )}
      >
        <List className="h-3.5 w-3.5" aria-hidden />
        List
      </button>
      <button
        type="button"
        aria-label="Board view"
        aria-pressed={value === 'board'}
        onClick={() => onChange('board')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition',
          'focus-visible:ring-2 focus-visible:ring-ink/20',
          value === 'board'
            ? 'bg-surface-elevated text-ink'
            : 'text-muted hover:text-ink',
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
        Board
      </button>
    </div>
  )
}
