import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { BrandMark } from '@/components/ui/BrandMark'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import {
  findActiveNavLabel,
  isDrawerItemActive,
  type PortalNavSection,
} from '@/lib/portal-nav'

interface PortalShellProps {
  portal: string
  navItems: PortalNavSection[]
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
  const { pathname } = useLocation()
  const activeLabel = findActiveNavLabel(navItems, pathname)

  const nav = (
    <nav
      className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4"
      aria-label={`${portal} navigation`}
    >
      {navItems.map((section, sectionIndex) => (
        <div key={section.label ?? `section-${sectionIndex}`} className="space-y-1">
          {section.label ? (
            <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
              {section.label}
            </p>
          ) : null}
          {section.items.map((item) => {
            const active = isDrawerItemActive(pathname, item)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-bold transition',
                  active
                    ? 'bg-brand-700 text-white shadow-[0_4px_12px_-4px_rgb(15_92_50/0.55)]'
                    : 'text-muted hover:bg-white hover:text-ink',
                )}
              >
                <span>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span
                    className={cn(
                      'inline-flex min-w-[1.25rem] items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold',
                      active ? 'bg-white/20 text-white' : 'bg-brand-700 text-white',
                    )}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border/80 bg-surface-aside/95 backdrop-blur-md transition-transform lg:static lg:w-auto lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border/80 px-4 py-4">
          <BrandMark />
          <button
            type="button"
            className="rounded-lg p-1.5 text-muted hover:bg-white lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 px-4 pt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
            {portal}
          </p>
        </div>

        {nav}

        <div className="mt-auto shrink-0 border-t border-border/80 p-3">
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
          className="fixed inset-0 z-30 bg-ink/30 backdrop-blur-[1px] lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/80 bg-surface-elevated/90 px-4 py-3.5 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-border bg-white p-1.5 text-ink shadow-sm lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="truncate text-sm font-semibold text-muted">
              <span className="font-extrabold text-ink">{portal}</span>
              {activeLabel ? (
                <>
                  <span className="mx-1.5 text-border" aria-hidden>
                    /
                  </span>
                  <span className="font-bold">{activeLabel}</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-2">{headerActions}</div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
