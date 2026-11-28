import { ArrowLeft, type LucideProps } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Left arrow that appears on parent `group-hover`. Pair with a `group` Button/Link. */
export function BackArrow({ className, ...props }: LucideProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex w-0 shrink-0 -translate-x-1 overflow-hidden opacity-0 transition-all duration-200 ease-out',
        '-mr-2 group-hover:mr-0 group-hover:w-4 group-hover:translate-x-0 group-hover:opacity-100',
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" {...props} />
    </span>
  )
}
