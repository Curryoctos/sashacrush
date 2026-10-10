import { Link, NavLink, Outlet } from 'react-router-dom'
import { BrandMark } from '@/components/ui/BrandMark'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'
import { ROLE_DASHBOARD_PATH } from '@/types'

const NAV_LINKS = [
  { to: '/projects', label: 'Browse Projects', end: false },
  { to: '/about', label: 'How It Works', end: true },
  { to: '/community', label: 'Community', end: false },
]

/** Guest-facing shell — matches CommunityLayout density and ink chrome. */
export function PublicLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <BrandMark />
          <nav
            className="flex flex-wrap items-center gap-1 text-[13px]"
            aria-label="Public"
          >
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-2.5 py-1.5 transition',
                    isActive
                      ? 'bg-active font-medium text-ink'
                      : 'text-muted hover:bg-hover hover:text-ink',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <Link
                  className="rounded-lg px-2.5 py-1.5 text-muted hover:bg-hover hover:text-ink"
                  to={ROLE_DASHBOARD_PATH[user.role]}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="rounded-lg px-2.5 py-1.5 text-muted hover:bg-hover hover:text-ink"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                className="inline-flex h-8 items-center rounded-lg bg-ink px-3 text-[12px] font-medium text-ink-inverse hover:opacity-90"
                to="/login"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-6 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Powered by SashaCrush · CurryOctos</p>
          <div className="flex flex-wrap gap-4">
            <Link className="hover:text-ink" to="/about">
              How It Works
            </Link>
            <Link className="hover:text-ink" to="/login">
              Sign in
            </Link>
            <a className="hover:text-ink" href="mailto:hello@sashacrush.com">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
