import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_DASHBOARD_PATH } from '@/types'

export function CommunityLoginPage() {
  const { user, signIn, isLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!isLoading && user) {
    return <Navigate to={ROLE_DASHBOARD_PATH[user.role]} replace />
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const profile = await signIn(email.trim(), password)
      navigate(ROLE_DASHBOARD_PATH[profile.role], { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-[28px] font-semibold tracking-tight text-ink">
        Community sign in
      </h1>
      <p className="mt-3 text-[13px] text-muted">
        For incubation members. Staff use the main login.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => void onSubmit(event)}
      >
        <div className="ui-field">
          <label htmlFor="community-login-email" className="ui-label">
            Email
          </label>
          <input
            id="community-login-email"
            className="ui-input"
            type="email"
            value={email}
            disabled={busy}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>
        <div className="ui-field">
          <label htmlFor="community-login-password" className="ui-label">
            Password
          </label>
          <input
            id="community-login-password"
            className="ui-input"
            type="password"
            value={password}
            disabled={busy}
            onChange={(event) => setPassword(event.target.value)}
            required
            placeholder="••••••••"
          />
        </div>
        {error ? (
          <p className="ui-alert-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy} className="w-full" size="lg">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-muted">
        New here?{' '}
        <Link
          className="font-medium text-ink underline underline-offset-2"
          to="/community/register"
        >
          Register
        </Link>
        <span className="mx-1.5 text-border">·</span>
        <Link
          className="font-medium text-ink underline underline-offset-2"
          to="/login"
        >
          Staff / seller login
        </Link>
      </p>
    </div>
  )
}
