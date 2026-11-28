import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_DASHBOARD_PATH } from '@/types'

export function RoleRedirect() {
  const { user, isLoading, needsPasswordSetup } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  if (needsPasswordSetup) {
    return <Navigate to="/set-password" replace />
  }

  if (!user) {
    return <Navigate to="/projects" replace />
  }

  return <Navigate to={ROLE_DASHBOARD_PATH[user.role]} replace />
}
