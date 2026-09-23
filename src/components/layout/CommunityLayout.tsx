import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'

const links = [
  { to: '/community', label: 'Board', end: true },
  { to: '/community/schedule', label: 'Schedule', end: false },
]

export function CommunityLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#e8f0ea_0%,_#f7f5f2_45%,_#f3efe8_100%)]">
      <header className="border-b border-border/80 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <Link to="/community" className="font-display text-2xl font-semibold text-ink">
              SashaCrush Community
            </Link>
            <p className="text-xs uppercase tracking-[0.14em] text-brand-700">
              Pipeline incubation
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'font-medium text-muted hover:text-ink',
                    isActive && 'text-brand-800',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            {user?.role === 'admin' ? (
              <Link className="font-medium text-muted hover:text-ink" to="/admin/community">
                Moderate
              </Link>
            ) : null}
            {user ? (
              <>
                <span className="text-muted">{user.email}</span>
                <button
                  type="button"
                  className="font-medium text-brand-800 hover:underline"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link className="font-medium text-muted hover:text-ink" to="/community/login">
                  Sign in
                </Link>
                <Link
                  className="rounded-md bg-brand-700 px-3 py-1.5 font-medium text-white hover:bg-brand-800"
                  to="/community/register"
                >
                  Join
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
