import { useNavigate } from 'react-router-dom'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { StaffMfaGate } from '@/components/auth/StaffMfaGate'
import { PortalShell } from '@/components/layout/PortalShell'
import { useAuth } from '@/hooks/useAuth'
import { AGENT_NAV } from '@/lib/portal-nav'

export function AgentPortalLayout() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleSignOut = () => {
    void signOut().then(() => {
      navigate('/login', { replace: true })
    })
  }

  return (
    <PortalShell
      portal="Agent Portal"
      navItems={AGENT_NAV}
      headerActions={<NotificationCenter />}
      onSignOut={handleSignOut}
    >
      <StaffMfaGate
        mfaSetupPath="/agent/mfa-setup"
        mfaChallengePath="/agent/mfa-challenge"
      />
    </PortalShell>
  )
}
