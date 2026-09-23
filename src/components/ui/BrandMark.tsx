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
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-sm font-extrabold tracking-tight text-white shadow-[0_2px_8px_-2px_rgb(15_92_50/0.45),inset_0_1px_0_rgb(255_255_255/0.18)]">
        SC
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block font-display text-lg font-bold leading-none tracking-tight text-ink group-hover:text-brand-800">
            SashaCrush
          </span>
          <span className="mt-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">
            CurryOctos
          </span>
        </span>
      )}
    </Link>
  )
}
