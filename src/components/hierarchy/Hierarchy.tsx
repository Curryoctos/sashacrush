import type { ReactNode } from 'react'
import { ArrowUpRight, FolderOpen } from 'lucide-react'
import { EmptyState } from '@/components/ui/PageHeader'
import { cn } from '@/lib/cn'

export interface DealCardItem {
  id: string
  title: string
  /** Short hint only — keep sparse (e.g. "3 unread"). */
  hint?: string
  badge?: ReactNode
}

interface DealCardsProps {
  deals: DealCardItem[]
  onSelect: (id: string) => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  prompt?: string
  actions?: ReactNode
}

/** Level-1 cards: title + light hint only. Details live deeper. */
export function DealCards({
  deals,
  onSelect,
  emptyTitle = 'No deals yet',
  emptyDescription,
  emptyAction,
  prompt,
  actions,
}: DealCardsProps) {
  if (deals.length === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    )
  }

  return (
    <div className="space-y-3">
      {(prompt || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {prompt ? <p className="text-[13px] text-muted">{prompt}</p> : <span />}
          {actions}
        </div>
      )}

      <div className="ui-panel divide-y divide-border overflow-hidden">
        {deals.map((deal) => (
          <button
            key={deal.id}
            type="button"
            onClick={() => onSelect(deal.id)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-ink">
              <FolderOpen className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{deal.title}</p>
              {deal.hint ? <p className="mt-0.5 text-[12px] text-muted">{deal.hint}</p> : null}
            </div>
            {deal.badge}
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
          </button>
        ))}
      </div>
    </div>
  )
}

export interface FolderCardItem {
  id: string
  title: string
  description: string
  icon: ReactNode
  count?: number | string
  onSelect: () => void
}

interface FolderCardsProps {
  folders: FolderCardItem[]
  className?: string
}

/** Level-2 folders — plan-card style tiles. */
export function FolderCards({ folders, className }: FolderCardsProps) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {folders.map((folder) => (
        <button
          key={folder.id}
          type="button"
          onClick={folder.onSelect}
          className="group rounded-xl border border-border bg-surface-elevated p-5 text-left transition hover:border-muted/40 hover:bg-surface/60"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-ink [&_svg]:h-4 [&_svg]:w-4">
              {folder.icon}
            </div>
            {folder.count != null ? (
              <span className="text-[20px] font-semibold tracking-tight text-ink tabular-nums">
                {folder.count}
              </span>
            ) : (
              <ArrowUpRight
                className="h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100"
                strokeWidth={1.75}
                aria-hidden
              />
            )}
          </div>
          <p className="mt-4 text-[15px] font-medium tracking-tight text-ink">{folder.title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{folder.description}</p>
        </button>
      ))}
    </div>
  )
}

interface HierarchyNavProps {
  crumbs: Array<{ label: string; onClick?: () => void }>
}

export function HierarchyNav({ crumbs }: HierarchyNavProps) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-2">
          {index > 0 ? (
            <span aria-hidden className="text-border">
              /
            </span>
          ) : null}
          {crumb.onClick ? (
            <button type="button" className="hover:text-ink" onClick={crumb.onClick}>
              {crumb.label}
            </button>
          ) : (
            <span className="font-medium text-ink">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
