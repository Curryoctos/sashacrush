import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
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
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Join the community</h1>
        <p className="mt-2 text-sm text-muted">
          Register to post updates and connect with incubation collaborators.
        </p>
      </div>
      <Card>
        <CardHeader title="Create account" description="Separate from the land-deal staff portals." />
        <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
          <label className="block space-y-1.5">
            <span className="ui-label">Display name</span>
            <input
              className="ui-input"
              value={displayName}
              disabled={busy}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="ui-label">Email</span>
            <input
              className="ui-input"
              type="email"
              value={email}
              disabled={busy}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="ui-label">Password</span>
            <input
              className="ui-input"
              type="password"
              value={password}
              disabled={busy}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="ui-label">Location (optional)</span>
            <input
              className="ui-input"
              value={location}
              disabled={busy}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="City, country"
            />
          </label>
          {error ? (
            <p className="ui-alert-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Creating…' : 'Register'}
          </Button>
        </form>
      </Card>
      <p className="text-sm text-muted">
        Already a member?{' '}
        <Link className="text-brand-800 underline" to="/community/login">
          Sign in
        </Link>
      </p>
    </div>
  )
}
