import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
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
    <div className="mx-auto max-w-md space-y-7">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-700">
          Pipeline
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink">
          Community sign in
        </h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-muted">
          For incubation members. Staff use the main login.
        </p>
      </div>
      <Card padding="lg">
        <CardHeader title="Email & password" />
        <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
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
      </Card>
      <p className="text-sm font-semibold text-muted">
        New here?{' '}
        <Link
          className="font-bold text-brand-700 underline hover:text-brand-900"
          to="/community/register"
        >
          Register
        </Link>
        {' · '}
        <Link className="font-bold text-brand-700 underline hover:text-brand-900" to="/login">
          Staff / seller login
        </Link>
      </p>
    </div>
  )
}
