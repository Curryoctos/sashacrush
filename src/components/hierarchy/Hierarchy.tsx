import type { ReactNode } from 'react'
import { FolderOpen } from 'lucide-react'
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
  prompt = 'Select a deal to continue.',
  actions,
}: DealCardsProps) {
  if (deals.length === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted">{prompt}</p>
        {actions}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {deals.map((deal) => (
          <button
            key={deal.id}
            type="button"
            onClick={() => onSelect(deal.id)}
            className="group rounded-xl border border-border/90 bg-surface-elevated p-5 text-left shadow-[0_1px_2px_rgb(11_18_14/0.04)] transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-[0_8px_24px_-12px_rgb(15_92_50/0.25)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-800 ring-1 ring-brand-100">
                <FolderOpen className="h-5 w-5" aria-hidden />
              </div>
              {deal.badge}
            </div>
            <h3 className="mt-4 truncate text-[15px] font-extrabold tracking-tight text-ink group-hover:text-brand-900">
              {deal.title}
            </h3>
            {deal.hint ? (
              <p className="mt-1 text-xs font-semibold text-muted">{deal.hint}</p>
            ) : null}
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

/** Level-2 folders: area name + one-line description. */
export function FolderCards({ folders, className }: FolderCardsProps) {
  const cols =
    folders.length <= 2
      ? 'sm:grid-cols-2'
      : folders.length === 3
        ? 'sm:grid-cols-2 lg:grid-cols-3'
        : 'sm:grid-cols-2'

  return (
    <div className={cn('grid gap-3', cols, className)}>
      {folders.map((folder) => (
        <button
          key={folder.id}
          type="button"
          onClick={folder.onSelect}
          className="group rounded-xl border border-border/90 bg-surface-elevated p-5 text-left shadow-[0_1px_2px_rgb(11_18_14/0.04)] transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-[0_8px_24px_-12px_rgb(15_92_50/0.25)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-800 ring-1 ring-brand-100 transition group-hover:bg-white">
              {folder.icon}
            </div>
            {folder.count != null ? (
              <span className="font-display text-2xl font-bold tracking-tight text-ink">
                {folder.count}
              </span>
            ) : null}
          </div>
          <p className="mt-4 text-[15px] font-extrabold tracking-tight text-ink">{folder.title}</p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-muted">{folder.description}</p>
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
    <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-2">
          {index > 0 ? <span aria-hidden className="text-border">/</span> : null}
          {crumb.onClick ? (
            <button
              type="button"
              className="font-bold text-brand-700 hover:text-brand-900"
              onClick={crumb.onClick}
            >
              {crumb.label}
            </button>
          ) : (
            <span className="font-extrabold text-ink">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
