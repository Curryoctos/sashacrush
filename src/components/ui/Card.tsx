import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  ref?: Ref<HTMLDivElement>
}

const paddingClass = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
} as const

/** Surface for forms and interactive blocks. Prefer tables/lists for dense data. */
export function Card({
  children,
  className,
  padding = 'md',
  ref,
  ...props
}: CardProps) {
  return (
    <div
      ref={ref}
      className={cn('ui-panel', paddingClass[padding], className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div className="min-w-0">
        <h2 className="ui-section-title">{title}</h2>
        {description ? <p className="ui-section-desc">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
  emphasize = false,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  emphasize?: boolean
}) {
  return (
    <div className={cn('ui-stat', emphasize && 'border-brand-200 bg-brand-50')}>
      <p className="ui-stat-label">{label}</p>
      <p className="ui-stat-value">{value}</p>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  )
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>{children}</div>
  )
}
