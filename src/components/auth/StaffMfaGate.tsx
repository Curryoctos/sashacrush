import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useMfaAssurance, useMfaStatus } from '@/features/auth/useMfa'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

interface StaffMfaGateProps {
  mfaSetupPath: string
  mfaChallengePath: string
}

const STAFF_ROLES: UserRole[] = ['admin', 'agent', 'executive']

/**
 * Set to `true` to require TOTP enrollment + AAL2 before staff portals (C-01 / C-30).
 * Deferred for now so staff can use live dashboards without MFA friction.
 */
const STAFF_MFA_REQUIRED = false

export function StaffMfaGate({ mfaSetupPath, mfaChallengePath }: StaffMfaGateProps) {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  const { hasVerifiedTotp, isChecking: isCheckingEnrollment } = useMfaStatus()
  const { needsChallenge, isChecking: isCheckingAssurance } = useMfaAssurance()

  if (!STAFF_MFA_REQUIRED) {
    return <Outlet />
  }

  if (
    isLoading ||
    isCheckingEnrollment ||
    isCheckingAssurance ||
    hasVerifiedTotp === null ||
    needsChallenge === null
  ) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted">Checking security settings…</p>
      </div>
    )
  }

  if (!user || !STAFF_ROLES.includes(user.role)) {
    return <Outlet />
  }

  if (location.pathname === mfaSetupPath || location.pathname === mfaChallengePath) {
    return <Outlet />
  }

  if (!hasVerifiedTotp) {
    return <Navigate to={mfaSetupPath} replace />
  }

  if (needsChallenge) {
    return <Navigate to={mfaChallengePath} replace />
  }

  return <Outlet />
}
