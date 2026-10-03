import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { registerCommunityMember } from '@/features/community/useCommunity'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_DASHBOARD_PATH } from '@/types'

export function CommunityRegisterPage() {
  const { user, signIn, isLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [location, setLocation] = useState('')
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
      await registerCommunityMember({ email, password, displayName, location })
      await signIn(email.trim(), password)
      navigate('/community', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-[28px] font-semibold tracking-tight text-ink">
        Join the community
      </h1>
      <p className="mt-3 text-[13px] text-muted">
        Register to post updates and connect with incubation collaborators.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => void onSubmit(event)}
      >
        <div className="ui-field">
          <label htmlFor="community-name" className="ui-label">
            Display name
          </label>
          <input
            id="community-name"
            className="ui-input"
            value={displayName}
            disabled={busy}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </div>
        <div className="ui-field">
          <label htmlFor="community-email" className="ui-label">
            Email
          </label>
          <input
            id="community-email"
            className="ui-input"
            type="email"
            value={email}
            disabled={busy}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="ui-field">
          <label htmlFor="community-password" className="ui-label">
            Password
          </label>
          <input
            id="community-password"
            className="ui-input"
            type="password"
            value={password}
            disabled={busy}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
          <p className="ui-hint">At least 8 characters.</p>
        </div>
        <div className="ui-field">
          <label htmlFor="community-location" className="ui-label">
            Location
          </label>
          <input
            id="community-location"
            className="ui-input"
            value={location}
            disabled={busy}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="City, country (optional)"
          />
        </div>
        {error ? (
          <p className="ui-alert-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy} className="w-full" size="lg">
          {busy ? 'Creating…' : 'Register'}
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-muted">
        Already a member?{' '}
        <Link
          className="font-medium text-ink underline underline-offset-2"
          to="/community/login"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
