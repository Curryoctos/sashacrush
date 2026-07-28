export interface PortalNavItem {
  label: string
  to: string
  badge?: number
}

export const ADMIN_NAV: PortalNavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard' },
  { label: 'Users', to: '/admin/users' },
  { label: 'Land Records', to: '/admin/land-records' },
  { label: 'Documents', to: '/admin/documents' },
  { label: 'Payments', to: '/admin/payments' },
  { label: 'Messages', to: '/admin/chat' },
  { label: 'Audit Log', to: '/admin/audit-log' },
]

export const SELLER_NAV: PortalNavItem[] = [
  { label: 'Dashboard', to: '/seller/dashboard' },
  { label: 'Messages', to: '/seller/chat' },
  { label: 'Documents', to: '/seller/documents' },
  { label: 'Receipts', to: '/seller/receipts' },
  { label: 'Photos', to: '/seller/photos' },
]

export const AGENT_NAV: PortalNavItem[] = [
  { label: 'Dashboard', to: '/agent/dashboard' },
  { label: 'Land Records', to: '/agent/land-records' },
  { label: 'Documents', to: '/agent/documents' },
  { label: 'Messages', to: '/agent/chat' },
  { label: 'Field Photos', to: '/agent/photos' },
]

export const EXECUTIVE_NAV: PortalNavItem[] = [
  { label: 'Dashboard', to: '/executive/dashboard' },
  { label: 'Deals', to: '/executive/deals' },
  { label: 'Messages', to: '/executive/chat' },
]
