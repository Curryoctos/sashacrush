import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function BrandMark({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <Link to="/" className={cn('group inline-flex items-center gap-2.5', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-700 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]">
        SC
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block font-display text-base font-semibold leading-none tracking-tight text-ink group-hover:text-brand-800">
            SashaCrush
          </span>
          <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            CurryOctos
          </span>
        </span>
      )}
    </Link>
  )
}
