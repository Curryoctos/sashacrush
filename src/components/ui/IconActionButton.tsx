import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type IconActionVariant = 'secondary' | 'primary' | 'danger'

interface IconActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: ReactNode
  variant?: IconActionVariant
}

const variantClass: Record<IconActionVariant, string> = {
  secondary: 'border border-border bg-surface-elevated text-ink hover:bg-hover',
  primary: 'bg-ink text-ink-inverse hover:opacity-90',
  danger: 'bg-danger text-white hover:opacity-90',
}

export function IconActionButton({
  label,
  icon,
  variant = 'secondary',
  className,
  type = 'button',
  disabled,
  ...props
}: IconActionButtonProps) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClass[variant],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )
}
