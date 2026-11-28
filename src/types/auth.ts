export type UserRole = 'admin' | 'executive' | 'agent' | 'seller' | 'community'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin / Owner',
  executive: 'Executive',
  agent: 'Agent',
  seller: 'Seller / Land Owner',
  community: 'Community member',
}

export const ROLE_HOME_PATH: Record<UserRole, string> = {
  admin: '/admin',
  executive: '/executive',
  agent: '/agent',
  seller: '/seller',
  community: '/community',
}

export const ROLE_DASHBOARD_PATH: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  executive: '/executive/dashboard',
  agent: '/agent/dashboard',
  seller: '/seller/dashboard',
  community: '/community',
}
