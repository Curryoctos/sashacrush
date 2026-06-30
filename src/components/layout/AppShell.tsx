import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AppShellProps {
  title: string
  description?: string
  children: ReactNode
}

export function AppShell({ title, description, children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="text-lg font-semibold text-brand-700">
            SashaCrush
          </Link>
          <span className="text-sm text-muted">CurryOctos</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-muted">{description}</p>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  )
}
