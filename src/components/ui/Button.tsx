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
  primary:
    'bg-brand-700 text-white shadow-[0_1px_2px_rgb(11_18_14/0.2),inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-brand-800 active:bg-brand-900',
  secondary:
    'border border-border bg-white text-ink shadow-[0_1px_2px_rgb(11_18_14/0.04)] hover:border-brand-200 hover:bg-brand-50/50',
  ghost: 'text-muted hover:bg-white/80 hover:text-ink',
  danger: 'bg-danger text-white shadow-[0_1px_2px_rgb(180_35_24/0.25)] hover:bg-danger/90',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-bold',
  md: 'px-4 py-2.5 text-sm font-bold',
  lg: 'px-5 py-3 text-sm font-extrabold tracking-tight',
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
        'inline-flex items-center justify-center gap-2 rounded-lg transition',
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
