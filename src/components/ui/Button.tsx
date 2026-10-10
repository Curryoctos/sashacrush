import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-ink-inverse hover:opacity-90',
  secondary:
    'border border-border bg-surface-elevated text-ink hover:bg-hover',
  ghost: 'text-muted hover:bg-hover hover:text-ink',
  danger: 'bg-danger text-white hover:opacity-90',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[12px] font-medium',
  md: 'h-9 px-3.5 text-[13px] font-medium',
  lg: 'h-10 px-4 text-[13px] font-medium',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-lg transition',
        'disabled:pointer-events-none disabled:opacity-45',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
