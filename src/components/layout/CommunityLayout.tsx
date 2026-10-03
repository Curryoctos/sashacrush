import { Link, NavLink, Outlet } from 'react-router-dom'
import { BrandMark } from '@/components/ui/BrandMark'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'

const links = [
  { to: '/community', label: 'Board', end: true },
  { to: '/community/schedule', label: 'Schedule', end: false },
]

export function CommunityLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <BrandMark />
          <nav className="flex flex-wrap items-center gap-1 text-[13px]">
            {links.map((link) => (
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
            {user?.role === 'admin' ? (
              <Link
                className="rounded-lg px-2.5 py-1.5 text-muted hover:bg-hover hover:text-ink"
                to="/admin/community"
              >
                Moderate
              </Link>
            ) : null}
            {user ? (
              <>
                <span className="px-2.5 text-muted">{user.email}</span>
                <button
                  type="button"
                  className="rounded-lg px-2.5 py-1.5 text-muted hover:bg-hover hover:text-ink"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  className="rounded-lg px-2.5 py-1.5 text-muted hover:bg-hover hover:text-ink"
                  to="/community/login"
                >
                  Sign in
                </Link>
                <Link
                  className="inline-flex h-8 items-center rounded-lg bg-ink px-3 text-[12px] font-medium text-ink-inverse hover:opacity-90"
                  to="/community/register"
                >
                  Join
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Outlet />
      </main>
    </div>
  )
}
