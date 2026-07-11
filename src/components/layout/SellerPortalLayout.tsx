import { useMemo } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { PortalShell } from '@/components/layout/PortalShell'
import { useSellerUnreadCount } from '@/features/chat/useSellerUnreadCount'
import { useAuth } from '@/hooks/useAuth'
import { SELLER_NAV, type PortalNavItem } from '@/lib/portal-nav'

export function SellerPortalLayout() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { data: unreadCount = 0 } = useSellerUnreadCount()

  const navItems = useMemo((): PortalNavItem[] => {
    return SELLER_NAV.map((item) =>
      item.to === '/seller/chat' ? { ...item, badge: unreadCount } : item,
    )
  }, [unreadCount])

  const handleSignOut = () => {
    void signOut().then(() => {
      navigate('/login', { replace: true })
    })
  }

  return (
    <PortalShell
      portal="Seller Portal"
      navItems={navItems}
      headerActions={<NotificationCenter />}
      onSignOut={handleSignOut}
    >
      <Outlet />
    </PortalShell>
  )
}
