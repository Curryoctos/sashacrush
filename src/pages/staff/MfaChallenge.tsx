import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  challengeAndVerifyTotp,
  getVerifiedTotpFactorId,
  useMfaAssurance,
} from '@/features/auth/useMfa'
import { notifySuccess } from '@/features/notifications/useNotifications'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_DASHBOARD_PATH } from '@/types'

interface StaffMfaChallengePageProps {
  backPath: string
}

export function StaffMfaChallengePage({ backPath }: StaffMfaChallengePageProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { needsChallenge, refresh } = useMfaAssurance()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    void getVerifiedTotpFactorId().then(setFactorId)
  }, [])

  useEffect(() => {
    if (needsChallenge === false && user) {
      navigate(ROLE_DASHBOARD_PATH[user.role], { replace: true })
    }
  }, [needsChallenge, navigate, user])

  const handleVerify = async () => {
    if (!factorId) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await challengeAndVerifyTotp(factorId, code.trim())
      await refresh()
      notifySuccess('Two-factor authentication verified.')
      if (user) {
        navigate(ROLE_DASHBOARD_PATH[user.role], { replace: true })
      }
    } catch (verifyError) {
      setError(
        verifyError instanceof Error ? verifyError.message : 'Invalid verification code.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="ui-page max-w-lg">
      <Card padding="lg">
        <h1 className="font-display text-2xl font-semibold text-ink">Verify your identity</h1>
        <p className="mt-2 text-sm text-muted">
          Enter the 6-digit code from your authenticator app to continue.
        </p>

        <div className="mt-6">
          <label htmlFor="mfa-challenge-code" className="ui-label">
            Verification code
          </label>
          <input
            id="mfa-challenge-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="ui-input mt-1.5"
            placeholder="123456"
          />
        </div>

        <Button
          className="mt-4"
          onClick={() => void handleVerify()}
          disabled={isSubmitting || code.trim().length < 6 || !factorId}
        >
          {isSubmitting ? 'Verifying…' : 'Verify and continue'}
        </Button>

        {error && (
          <p className="ui-alert-danger mt-4" role="alert">
            {error}
          </p>
        )}

        <p className="mt-6 text-sm">
          <Link to={backPath} className="font-medium text-brand-700 hover:text-brand-800">
            Back to dashboard
          </Link>
        </p>
      </Card>
    </div>
  )
}
