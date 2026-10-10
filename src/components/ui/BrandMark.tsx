import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function BrandGlyph({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'md' | 'lg'
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-ink font-semibold tracking-tight text-ink-inverse',
        size === 'lg' ? 'h-9 w-9 rounded-lg text-[13px]' : 'h-6 w-6 rounded-md text-[10px]',
        className,
      )}
      aria-hidden
    >
      SC
    </span>
  )
}

export function BrandMark({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2 outline-offset-4', className)}>
      <BrandGlyph />
      {!compact && (
        <span className="text-[13px] font-semibold tracking-tight text-ink">SashaCrush</span>
      )}
    </Link>
  )
}
