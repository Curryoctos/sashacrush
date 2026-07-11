import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  challengeAndVerifyTotp,
  getVerifiedTotpFactorId,
  useMfaAssurance,
} from '@/features/auth/useMfa'
import { notifySuccess } from '@/features/notifications/useNotifications'
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
    <div className="p-8">
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-ink">Verify your identity</h1>
        <p className="mt-2 text-sm text-muted">
          Enter the 6-digit code from your authenticator app to continue.
        </p>

        <div className="mt-6">
          <label htmlFor="mfa-challenge-code" className="block text-sm font-medium text-ink">
            Verification code
          </label>
          <input
            id="mfa-challenge-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="123456"
          />
        </div>

        <button
          type="button"
          onClick={() => void handleVerify()}
          disabled={isSubmitting || code.trim().length < 6 || !factorId}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {isSubmitting ? 'Verifying…' : 'Verify and continue'}
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <p className="mt-6 text-sm">
          <Link to={backPath} className="text-brand-700 hover:underline">
            Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  )
}
