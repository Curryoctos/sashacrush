export interface PortalNavItem {
  label: string
  to: string
  badge?: number
}

export const ADMIN_NAV: PortalNavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard' },
  { label: 'Users', to: '/admin/users' },
  { label: 'Land Records', to: '/admin/land-records' },
  { label: 'Analytics', to: '/admin/analytics' },
  { label: 'Suggestions', to: '/admin/suggestions' },
  { label: 'Community', to: '/admin/community' },
  { label: 'Cargo', to: '/admin/cargo' },
  { label: 'Media', to: '/admin/media' },
  { label: 'Field Photos', to: '/admin/photos' },
  { label: 'Documents', to: '/admin/documents' },
  { label: 'Agent Agreements', to: '/admin/investor-documents' },
  { label: 'Payments', to: '/admin/payments' },
  { label: 'Capital', to: '/admin/capital' },
  { label: 'Wallet', to: '/admin/wallet' },
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
  { label: 'Analytics', to: '/agent/analytics' },
  { label: 'Suggestions', to: '/agent/suggestions' },
  { label: 'Cargo', to: '/agent/cargo' },
  { label: 'Documents', to: '/agent/documents' },
  { label: 'Receipts', to: '/agent/receipts' },
  { label: 'Investments', to: '/agent/investments' },
  { label: 'Agreements', to: '/agent/agreements' },
  { label: 'Messages', to: '/agent/chat' },
  { label: 'Field Photos', to: '/agent/photos' },
]

export const EXECUTIVE_NAV: PortalNavItem[] = [
  { label: 'Dashboard', to: '/executive/dashboard' },
  { label: 'Portfolio', to: '/executive/deals' },
  { label: 'Analytics', to: '/executive/analytics' },
  { label: 'Communications', to: '/executive/communications' },
  { label: 'Media', to: '/executive/media' },
]
