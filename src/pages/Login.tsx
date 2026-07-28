import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
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
    <AppShell centered>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
            Transaction workspace
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
            Sign in to SashaCrush
          </h1>
          <p className="mt-2 text-sm text-muted">
            Cross-border land deals, payments, documents, and deal-room collaboration.
          </p>
        </div>

        <Card padding="lg">
          <div className="flex rounded-lg border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => {
                setMode('staff')
                setError(null)
                setMagicLinkSent(false)
              }}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === 'staff'
                  ? 'border border-border bg-white text-ink'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Staff
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
                  ? 'border border-border bg-white text-ink'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Seller
            </button>
          </div>

          {mode === 'staff' ? (
            <form onSubmit={handleStaffSubmit} className="mt-6 space-y-4">
              <p className="text-sm text-muted">
                Admin, executive, and agent accounts use email and password.
              </p>
              <div>
                <label htmlFor="email" className="ui-label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ui-input mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="password" className="ui-label">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ui-input mt-1.5"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting ? 'Signing in…' : 'Continue'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSellerSubmit} className="mt-6 space-y-4">
              <p className="text-sm text-muted">
                Sellers receive a one-time secure link. No password required.
              </p>
              <div>
                <label htmlFor="seller-email" className="ui-label">
                  Email
                </label>
                <input
                  id="seller-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ui-input mt-1.5"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting || magicLinkSent}
                className="w-full"
                size="lg"
              >
                {magicLinkSent
                  ? 'Link sent — check your email'
                  : submitting
                    ? 'Sending…'
                    : 'Send magic link'}
              </Button>
              {magicLinkSent && (
                <p className="ui-alert-success">
                  If this email is registered as a seller, a sign-in link is on the way.
                </p>
              )}
            </form>
          )}

          {error && (
            <p className="ui-alert-danger mt-4" role="alert">
              {error}
            </p>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-muted">
          Protected workspace · CurryOctos · sashacrush.com
        </p>
      </div>
    </AppShell>
  )
}
