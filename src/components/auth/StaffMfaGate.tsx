import { Outlet } from 'react-router-dom'

interface StaffMfaGateProps {
  mfaSetupPath: string
  mfaChallengePath: string
}

/**
 * MFA temporarily disabled — staff can use portals without TOTP enroll/challenge.
 *
 * To restore:
 * 1. Replace this body with the original enforcement (see git history / block below).
 * 2. Uncomment MFA routes in `src/routes/router.tsx`.
 *
 * Original enforcement (restore later):
 * ```
 * import { Navigate, Outlet, useLocation } from 'react-router-dom'
 * import { useMfaAssurance, useMfaStatus } from '@/features/auth/useMfa'
 * import { useAuth } from '@/hooks/useAuth'
 * import type { UserRole } from '@/types'
 *
 * const STAFF_ROLES: UserRole[] = ['admin', 'agent', 'executive']
 *
 * export function StaffMfaGate({ mfaSetupPath, mfaChallengePath }: StaffMfaGateProps) {
 *   const { user, isLoading } = useAuth()
 *   const location = useLocation()
 *   const { hasVerifiedTotp, isChecking: isCheckingEnrollment } = useMfaStatus()
 *   const { needsChallenge, isChecking: isCheckingAssurance } = useMfaAssurance()
 *
 *   if (isLoading || isCheckingEnrollment || isCheckingAssurance ||
 *       hasVerifiedTotp === null || needsChallenge === null) {
 *     return <div className="flex min-h-[40vh] items-center justify-center">
 *       <p className="text-muted">Checking security settings…</p>
 *     </div>
 *   }
 *
 *   if (!user || !STAFF_ROLES.includes(user.role)) return <Outlet />
 *   if (location.pathname === mfaSetupPath || location.pathname === mfaChallengePath) {
 *     return <Outlet />
 *   }
 *   if (!hasVerifiedTotp) return <Navigate to={mfaSetupPath} replace />
 *   if (needsChallenge) return <Navigate to={mfaChallengePath} replace />
 *   return <Outlet />
 * }
 * ```
 */
export function StaffMfaGate(_props: StaffMfaGateProps) {
  return <Outlet />
}
