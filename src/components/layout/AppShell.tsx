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
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface-elevated/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <BrandMark />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Secure portal
          </span>
        </div>
      </header>

      <main
        className={
          centered
            ? 'mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-6xl items-center justify-center px-4 py-10 sm:px-6'
            : 'mx-auto max-w-6xl px-4 py-8 sm:px-6'
        }
      >
        {(title || description) && !centered ? (
          <div className="mb-8">
            {title ? (
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {title}
              </h1>
            ) : null}
            {description ? <p className="mt-2 max-w-2xl text-muted">{description}</p> : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  )
}
