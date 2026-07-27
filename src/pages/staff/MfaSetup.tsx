import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  enrollTotpFactor,
  useMfaStatus,
  verifyTotpEnrollment,
} from '@/features/auth/useMfa'
import { notifySuccess } from '@/features/notifications/useNotifications'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
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
    <div className="ui-page max-w-lg">
      <Card padding="lg">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Set up two-factor authentication
        </h1>
        <p className="mt-2 text-sm text-muted">
          Staff accounts require an authenticator app (Google Authenticator, Authy, etc.) for
          additional security on deal and payment operations.
        </p>

        {!factorId && (
          <Button className="mt-6" onClick={() => void startEnrollment()}>
            Start MFA setup
          </Button>
        )}

        {qrCode && (
          <div className="mt-6 space-y-4">
            <img src={qrCode} alt="MFA QR code" className="mx-auto h-48 w-48" />
            {secret && (
              <p className="text-center text-xs text-muted">
                Manual entry secret:{' '}
                <code className="rounded bg-surface px-1 text-ink">{secret}</code>
              </p>
            )}
            <div>
              <label htmlFor="mfa-code" className="ui-label">
                Verification code
              </label>
              <input
                id="mfa-code"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="ui-input mt-1.5"
                placeholder="123456"
              />
            </div>
            <Button
              onClick={() => void handleVerify()}
              disabled={isSubmitting || code.trim().length < 6}
            >
              {isSubmitting ? 'Verifying…' : 'Verify and enable'}
            </Button>
          </div>
        )}

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
