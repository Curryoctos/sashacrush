import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

const toneClass: Record<BadgeTone, string> = {
  neutral: 'bg-surface text-muted',
  brand: 'bg-brand-50 text-brand-800',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
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
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium tracking-wide',
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
  if (value === 'confirmed' || value === 'signed' || value === 'active' || value === 'paid') {
    return 'success'
  }
  if (value === 'pending' || value === 'sent' || value === 'draft') {
    return 'warning'
  }
  if (value === 'failed' || value === 'archived' || value === 'cancelled' || value === 'rejected') {
    return 'danger'
  }
  return 'neutral'
}
