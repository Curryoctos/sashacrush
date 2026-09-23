import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

const toneClass: Record<BadgeTone, string> = {
  neutral: 'border-border bg-surface text-muted',
  brand: 'border-brand-200 bg-brand-50 text-brand-800',
  success: 'border-success/20 bg-success-soft text-success',
  warning: 'border-warning/20 bg-warning-soft text-warning',
  danger: 'border-danger/20 bg-danger-soft text-danger',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em]',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function statusTone(status: string): BadgeTone {
  const value = status.toLowerCase()
  if (
    value === 'confirmed' ||
    value === 'signed' ||
    value === 'active' ||
    value === 'paid' ||
    value === 'approved' ||
    value === 'delivered' ||
    value === 'cleared'
  ) {
    return 'success'
  }
  if (
    value === 'pending' ||
    value === 'sent' ||
    value === 'draft' ||
    value === 'submitted' ||
    value === 'under_review' ||
    value === 'under review' ||
    value === 'ordered' ||
    value === 'in_transit' ||
    value === 'at_port'
  ) {
    return 'warning'
  }
  if (value === 'failed' || value === 'archived' || value === 'cancelled' || value === 'rejected') {
    return 'danger'
  }
  return 'neutral'
}
