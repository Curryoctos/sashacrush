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
      className={cn('inline-flex rounded-md border border-border bg-white p-0.5', className)}
    >
      <button
        type="button"
        aria-label="List view"
        aria-pressed={value === 'list'}
        onClick={() => onChange('list')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition',
          'focus-visible:ring-2 focus-visible:ring-brand-600',
          value === 'list'
            ? 'bg-brand-700 text-white'
            : 'text-muted hover:bg-surface hover:text-ink',
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
          'inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition',
          'focus-visible:ring-2 focus-visible:ring-brand-600',
          value === 'board'
            ? 'bg-brand-700 text-white'
            : 'text-muted hover:bg-surface hover:text-ink',
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
        Board
      </button>
    </div>
  )
}
