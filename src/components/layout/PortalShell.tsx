import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PortalNavItem {
  label: string
  to: string
}

interface PortalShellProps {
  portal: string
  navItems: PortalNavItem[]
  children: ReactNode
}

export function PortalShell({ portal, navItems, children }: PortalShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Link to="/" className="text-lg font-semibold text-brand-700">
              SashaCrush
            </Link>
            <p className="text-sm text-muted">{portal}</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
