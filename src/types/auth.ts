export type UserRole = 'admin' | 'executive' | 'agent' | 'seller'

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
}

export const ROLE_HOME_PATH: Record<UserRole, string> = {
  admin: '/admin',
  executive: '/executive',
  agent: '/agent',
  seller: '/seller',
}

export const ROLE_DASHBOARD_PATH: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  executive: '/executive/dashboard',
  agent: '/agent/dashboard',
  seller: '/seller/dashboard',
}
