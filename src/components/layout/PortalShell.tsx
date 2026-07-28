import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { BrandMark } from '@/components/ui/BrandMark'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
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
  const [mobileOpen, setMobileOpen] = useState(false)

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-3" aria-label={`${portal} navigation`}>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition',
              isActive
                ? 'bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200'
                : 'text-muted hover:bg-white hover:text-ink',
            )
          }
        >
          <span>{item.label}</span>
          {item.badge != null && item.badge > 0 && (
            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded bg-brand-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface-aside transition-transform lg:static lg:w-auto lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <BrandMark />
          <button
            type="button"
            className="rounded-md p-1.5 text-muted hover:bg-white lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {portal}
          </p>
        </div>

        {nav}

        <div className="mt-auto border-t border-border p-3">
          {onSignOut && (
            <Button variant="ghost" className="w-full justify-start" onClick={onSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          )}
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink/25 lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-surface-elevated px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md border border-border bg-white p-1.5 text-ink lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="hidden text-sm text-muted sm:block">
              Land transactions · payments · collaboration
            </p>
          </div>
          <div className="flex items-center gap-2">{headerActions}</div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
