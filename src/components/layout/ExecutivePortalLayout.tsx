import { useNavigate } from 'react-router-dom'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { StaffMfaGate } from '@/components/auth/StaffMfaGate'
import { PortalShell } from '@/components/layout/PortalShell'
import { useAuth } from '@/hooks/useAuth'
import { EXECUTIVE_NAV } from '@/lib/portal-nav'

export function ExecutivePortalLayout() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleSignOut = () => {
    void signOut().then(() => {
      navigate('/login', { replace: true })
    })
  }

  return (
    <PortalShell
      portal="Executive Portal"
      navItems={EXECUTIVE_NAV}
      headerActions={<NotificationCenter />}
      onSignOut={handleSignOut}
    >
      <StaffMfaGate
        mfaSetupPath="/executive/mfa-setup"
        mfaChallengePath="/executive/mfa-challenge"
      />
    </PortalShell>
  )
}
