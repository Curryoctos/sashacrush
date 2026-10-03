import type { ReactNode } from 'react'
import { BrandMark } from '@/components/ui/BrandMark'

interface AppShellProps {
  title?: string
  description?: string
  children: ReactNode
  centered?: boolean
}

export function AppShell({
  title,
  description,
  children,
  centered = false,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5 sm:px-8">
          <BrandMark />
        </div>
      </header>

      <main
        className={
          centered
            ? 'mx-auto flex min-h-[calc(100vh-3.25rem)] max-w-5xl items-center justify-center px-5 py-10 sm:px-8'
            : 'mx-auto max-w-5xl px-5 py-8 sm:px-8'
        }
      >
        {(title || description) && !centered ? (
          <div className="mb-8">
            {title ? (
              <h1 className="text-[28px] font-semibold tracking-tight text-ink">{title}</h1>
            ) : null}
            {description ? (
              <p className="mt-3 text-[13px] text-muted">{description}</p>
            ) : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  )
}
