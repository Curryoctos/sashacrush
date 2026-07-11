import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  enrollTotpFactor,
  useMfaStatus,
  verifyTotpEnrollment,
} from '@/features/auth/useMfa'
import { notifySuccess } from '@/features/notifications/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_DASHBOARD_PATH } from '@/types'

interface StaffMfaSetupPageProps {
  backPath: string
}

export function StaffMfaSetupPage({ backPath }: StaffMfaSetupPageProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { hasVerifiedTotp, refresh } = useMfaStatus()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (hasVerifiedTotp && user) {
      navigate(ROLE_DASHBOARD_PATH[user.role], { replace: true })
    }
  }, [hasVerifiedTotp, navigate, user])

  const startEnrollment = async () => {
    setError(null)
    try {
      const enrollment = await enrollTotpFactor()
      setFactorId(enrollment.factorId)
      setQrCode(enrollment.qrCode)
      setSecret(enrollment.secret)
    } catch (enrollError) {
      setError(
        enrollError instanceof Error
          ? enrollError.message
          : 'MFA enrollment is unavailable.',
      )
    }
  }

  const handleVerify = async () => {
    if (!factorId) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await verifyTotpEnrollment(factorId, code.trim())
      await refresh()
      notifySuccess('Two-factor authentication enabled.')
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
        <h1 className="text-2xl font-semibold text-ink">Set up two-factor authentication</h1>
        <p className="mt-2 text-sm text-muted">
          Staff accounts require an authenticator app (Google Authenticator, Authy, etc.) for
          additional security on deal and payment operations.
        </p>

        {!factorId && (
          <button
            type="button"
            onClick={() => void startEnrollment()}
            className="mt-6 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Start MFA setup
          </button>
        )}

        {qrCode && (
          <div className="mt-6 space-y-4">
            <img src={qrCode} alt="MFA QR code" className="mx-auto h-48 w-48" />
            {secret && (
              <p className="text-center text-xs text-muted">
                Manual entry secret: <code className="rounded bg-slate-100 px-1">{secret}</code>
              </p>
            )}
            <div>
              <label htmlFor="mfa-code" className="block text-sm font-medium text-ink">
                Verification code
              </label>
              <input
                id="mfa-code"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="123456"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleVerify()}
              disabled={isSubmitting || code.trim().length < 6}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Verifying…' : 'Verify and enable'}
            </button>
          </div>
        )}

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
