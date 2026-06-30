import { createContext } from 'react'
import type { AuthUser, UserRole } from '@/types'

export interface AuthContextValue {
  user: AuthUser | null
  role: UserRole | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<AuthUser>
  signOut: () => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
