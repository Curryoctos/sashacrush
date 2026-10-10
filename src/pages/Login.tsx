import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/ui/BrandMark'
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
      if (
        message.includes('Failed to fetch') ||
        message.includes('NetworkError')
      ) {
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
      setError(
        err instanceof Error ? err.message : 'Could not send magic link.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <BrandMark />
        <nav className="flex items-center gap-3 text-[13px]">
          <a href="/projects" className="text-muted hover:text-ink">
            Projects
          </a>
          <a href="/community" className="text-muted hover:text-ink">
            Community
          </a>
        </nav>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-10 sm:pt-16">
        <Card className="w-full max-w-sm" padding="lg">
          <h1 className="text-[28px] font-semibold tracking-tight text-ink">
            Sign in
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            Access your SashaCrush workspace.
          </p>

          <div className="mt-6">
            <div
              className="ui-segment"
              role="tablist"
              aria-label="Sign-in mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'staff'}
                onClick={() => {
                  setMode('staff')
                  setError(null)
                  setMagicLinkSent(false)
                }}
                className={`ui-segment-item ${
                  mode === 'staff'
                    ? 'ui-segment-item-active'
                    : 'ui-segment-item-idle'
                }`}
              >
                Staff
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'seller'}
                onClick={() => {
                  setMode('seller')
                  setError(null)
                  setMagicLinkSent(false)
                  setPassword('')
                }}
                className={`ui-segment-item ${
                  mode === 'seller'
                    ? 'ui-segment-item-active'
                    : 'ui-segment-item-idle'
                }`}
              >
                Seller
              </button>
            </div>

            {mode === 'staff' ? (
              <form onSubmit={handleStaffSubmit} className="mt-5 space-y-4">
                <div className="ui-field">
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
                    className="ui-input"
                    placeholder="you@company.com"
                  />
                </div>
                <div className="ui-field">
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
                    className="ui-input"
                    placeholder="••••••••"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? 'Signing in…' : 'Continue'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSellerSubmit} className="mt-5 space-y-4">
                <p className="ui-hint">
                  We’ll email you a one-time sign-in link.
                </p>
                <div className="ui-field">
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
                    className="ui-input"
                    placeholder="seller@example.com"
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
                    If this email is registered as a seller, a sign-in link is
                    on the way.
                  </p>
                )}
              </form>
            )}

            {error && (
              <p className="ui-alert-danger mt-4" role="alert">
                {error}
              </p>
            )}
          </div>
        </Card>
      </main>
    </div>
  )
}
