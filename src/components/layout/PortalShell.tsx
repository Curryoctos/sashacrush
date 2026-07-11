import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import type { PortalNavItem } from '@/lib/portal-nav'

interface PortalShellProps {
  portal: string
  navItems: PortalNavItem[]
  onSignOut?: () => void
  headerActions?: ReactNode
  children: ReactNode
}

export function PortalShell({
  portal,
  navItems,
  onSignOut,
  headerActions,
  children,
}: PortalShellProps) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Link to="/" className="text-lg font-semibold text-brand-700">
              SashaCrush
            </Link>
            <p className="text-sm text-muted">{portal}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex flex-wrap gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `relative rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-700 hover:bg-brand-50 hover:text-brand-700'
                    }`
                  }
                >
                  {item.label}
                  {item.badge != null && item.badge > 0 && (
                    <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
            {headerActions}
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-ink hover:bg-slate-50"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
