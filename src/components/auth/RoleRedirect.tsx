import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_DASHBOARD_PATH } from '@/types'

export function RoleRedirect() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={ROLE_DASHBOARD_PATH[user.role]} replace />
}
