import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { StaffMfaGate } from '@/components/auth/StaffMfaGate'
import { PortalShell } from '@/components/layout/PortalShell'
import { useAdminUnreadMessages } from '@/features/dashboard/useAdminDashboardStats'
import { useAuth } from '@/hooks/useAuth'
import { ADMIN_NAV, type PortalNavItem } from '@/lib/portal-nav'

export function AdminPortalLayout() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const unreadMessages = useAdminUnreadMessages()

  const navItems = useMemo((): PortalNavItem[] => {
    return ADMIN_NAV.map((item) =>
      item.to === '/admin/chat' ? { ...item, badge: unreadMessages } : item,
    )
  }, [unreadMessages])

  const handleSignOut = () => {
    void signOut().then(() => {
      navigate('/login', { replace: true })
    })
  }

  return (
    <PortalShell
      portal="Admin Portal"
      navItems={navItems}
      headerActions={<NotificationCenter />}
      onSignOut={handleSignOut}
    >
      <StaffMfaGate
        mfaSetupPath="/admin/mfa-setup"
        mfaChallengePath="/admin/mfa-challenge"
      />
    </PortalShell>
  )
}
