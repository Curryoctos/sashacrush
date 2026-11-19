import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function PageHeader({
  title,
  description,
  eyebrow: _eyebrow,
  actions,
  backTo,
  backLabel,
  className,
}: {
  title: string
  description?: string
  /** Deprecated — kept for call-site compat; not rendered. */
  eyebrow?: string
  actions?: ReactNode
  backTo?: string
  backLabel?: string
  className?: string
}) {
  void _eyebrow

  return (
    <header className={cn('flex flex-wrap items-start gap-4', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions || (backTo && backLabel) ? (
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-3 pt-1">
          {actions}
          {backTo && backLabel ? (
            <PageBackLink to={backTo} label={backLabel} />
          ) : null}
        </div>
      ) : null}
    </header>
  )
}

export function PageBackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-1 text-[13px] text-muted transition hover:text-ink"
    >
      <span
        aria-hidden
        className="inline-block max-w-0 -translate-x-1 overflow-hidden opacity-0 transition-all duration-200 ease-out -mr-1 group-hover:mr-0 group-hover:max-w-[1rem] group-hover:translate-x-0 group-hover:opacity-100"
      >
        ←
      </span>
      {label}
    </Link>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-[13px] text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function PageSection({
  title,
  description,
  actions,
  children,
}: {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="ui-panel p-5 sm:p-6">
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="ui-section-title">{title}</h2> : null}
            {description ? (
              <p className="ui-section-desc">{description}</p>
            ) : null}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}
