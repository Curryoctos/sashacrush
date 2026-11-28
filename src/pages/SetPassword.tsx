import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/ui/BrandMark'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_DASHBOARD_PATH } from '@/types'

const MIN_PASSWORD_LENGTH = 8

export function SetPasswordPage() {
  const navigate = useNavigate()
  const { user, isLoading, needsPasswordSetup, updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  // Recovery/invite session already completed — go to workspace.
  if (user && !needsPasswordSetup) {
    return <Navigate to={ROLE_DASHBOARD_PATH[user.role]} replace />
  }

  // No recovery session (expired / already used / wrong link).
  if (!needsPasswordSetup || !user) {
    return (
      <div className="flex min-h-screen flex-col bg-canvas">
        <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <BrandMark />
        </header>
        <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-10 sm:pt-16">
          <Card className="w-full max-w-sm" padding="lg">
            <h1 className="text-[28px] font-semibold tracking-tight text-ink">
              Link expired
            </h1>
            <p className="mt-2 text-[13px] text-muted">
              This set-password link is invalid or has already been used. Ask
              an administrator to send a new access email, then open the fresh
              link.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex text-[13px] font-medium text-brand hover:underline"
            >
              Back to sign in
            </Link>
          </Card>
        </main>
      </div>
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await updatePassword(password)
      navigate(ROLE_DASHBOARD_PATH[user.role], { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <BrandMark />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-10 sm:pt-16">
        <Card className="w-full max-w-sm" padding="lg">
          <h1 className="text-[28px] font-semibold tracking-tight text-ink">
            Set your password
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            Choose a password for <span className="text-ink">{user.email}</span>,
            then continue to your workspace.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="ui-field">
              <label htmlFor="new-password" className="ui-label">
                New password
              </label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="ui-field">
              <label htmlFor="confirm-password" className="ui-label">
                Confirm password
              </label>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? 'Saving…' : 'Save password'}
            </Button>
            {error && (
              <p className="ui-alert-danger" role="alert">
                {error}
              </p>
            )}
          </form>
        </Card>
      </main>
    </div>
  )
}
