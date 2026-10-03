import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { AccountMenu } from '@/components/layout/AccountMenu'
import { BrandMark } from '@/components/ui/BrandMark'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'
import {
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
  const { user } = useAuth()

  const nav = (
    <nav
      className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-2"
      aria-label={`${portal} navigation`}
    >
      {navItems.map((section, sectionIndex) => (
        <div key={section.label ?? `section-${sectionIndex}`} className="space-y-0.5">
          {section.label ? (
            <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted/80">
              {section.label}
            </p>
          ) : null}
          {section.items.map((item) => {
            const active = isDrawerItemActive(pathname, item)
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition',
                  active
                    ? 'bg-active font-medium text-ink'
                    : 'text-muted hover:bg-hover hover:text-ink',
                )}
              >
                {Icon ? (
                  <Icon
                    className={cn('h-4 w-4 shrink-0', active ? 'text-ink' : 'text-muted')}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span
                    className={cn(
                      'inline-flex min-w-[1.15rem] items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
                      active
                        ? 'bg-surface-elevated text-ink'
                        : 'bg-ink text-ink-inverse',
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
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-border bg-aside transition-transform duration-200 ease-out lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex shrink-0 items-center gap-2 px-3 py-3.5">
          <BrandMark className="min-w-0 flex-1" />
          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            <button
              type="button"
              className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {nav}

        <div className="mt-auto shrink-0 border-t border-border p-2">
          <AccountMenu
            portal={portal}
            email={user?.email ?? null}
            onSignOut={onSignOut}
          />
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-overlay lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-12 shrink-0 items-center border-b border-border bg-canvas px-4 sm:px-6 lg:hidden">
          <button
            type="button"
            className="rounded-lg border border-border p-1.5 text-ink hover:bg-hover"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-canvas">
          {children}
        </main>
      </div>
    </div>
  )
}
