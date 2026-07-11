import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_DASHBOARD_PATH } from '@/types'

type LoginMode = 'staff' | 'seller'

export function LoginPage() {
  const navigate = useNavigate()
  const { user, isLoading, signIn, signInWithMagicLink } = useAuth()
  const [mode, setMode] = useState<LoginMode>('staff')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!isLoading && user) {
    return <Navigate to={ROLE_DASHBOARD_PATH[user.role]} replace />
  }

  const handleStaffSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const profile = await signIn(email.trim(), password)
      navigate(ROLE_DASHBOARD_PATH[profile.role], { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed.'
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        setError(
          'Cannot reach Supabase. Run `npx supabase start` and confirm .env.local is set.',
        )
      } else {
        setError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSellerSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await signInWithMagicLink(email.trim())
      setMagicLinkSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send magic link.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell
      title="Sign in"
      description="Staff use email and password. Sellers sign in with a one-time magic link — no password required."
    >
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('staff')
              setError(null)
              setMagicLinkSent(false)
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              mode === 'staff'
                ? 'bg-white text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            Admin / Executive / Agent
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('seller')
              setError(null)
              setMagicLinkSent(false)
              setPassword('')
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              mode === 'seller'
                ? 'bg-white text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            Seller Login
          </button>
        </div>

        {mode === 'staff' ? (
          <form onSubmit={handleStaffSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="text-xs text-muted">
              Local dev: use password <code className="rounded bg-slate-100 px-1">changeme-local-only</code>{' '}
              with emails like <code className="rounded bg-slate-100 px-1">admin@sashacrush.com</code>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSellerSubmit} className="mt-6 space-y-4">
            <p className="text-sm text-muted">
              Enter your email and we&apos;ll send a secure sign-in link. Sellers never
              need a password.
            </p>
            <div>
              <label htmlFor="seller-email" className="block text-sm font-medium text-ink">
                Email
              </label>
              <input
                id="seller-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || magicLinkSent}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {magicLinkSent ? 'Link sent — check your email' : submitting ? 'Sending…' : 'Send magic link'}
            </button>
            {magicLinkSent && (
              <p className="text-sm text-brand-700">
                If your email is registered as a seller, you will receive a sign-in link shortly.
                Local dev: check Mailpit at{' '}
                <a href="http://127.0.0.1:54324" className="underline" target="_blank" rel="noreferrer">
                  127.0.0.1:54324
                </a>
                .
              </p>
            )}
          </form>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </AppShell>
  )
}
