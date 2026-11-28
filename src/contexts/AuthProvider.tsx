import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from '@/contexts/auth-context'
import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction'
import { supabase } from '@/lib/supabase'
import type { AuthUser, UserRole } from '@/types'

const PASSWORD_RECOVERY_KEY = 'sc_password_recovery'

interface AuthProviderProps {
  children: ReactNode
}

function readRecoveryFlag(): boolean {
  try {
    if (typeof window === 'undefined') return false
    if (sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === '1') return true
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    if (hash.get('type') === 'recovery') return true
  } catch {
    // sessionStorage may be unavailable
  }
  return false
}

function markPasswordRecovery(): void {
  try {
    sessionStorage.setItem(PASSWORD_RECOVERY_KEY, '1')
  } catch {
    // ignore
  }
}

function clearPasswordRecovery(): void {
  try {
    sessionStorage.removeItem(PASSWORD_RECOVERY_KEY)
  } catch {
    // ignore
  }
}

async function fetchProfile(session: Session): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, is_active')
    .eq('id', session.user.id)
    .single()

  if (error || !data) {
    return null
  }

  if (data.is_active === false) {
    return null
  }

  return {
    id: data.id,
    email: data.email,
    role: data.role as UserRole,
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authReady, setAuthReady] = useState(false)
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(readRecoveryFlag)

  // Listen for session changes — must stay synchronous (no await / Supabase calls here).
  // Async work inside onAuthStateChange deadlocks signInWithPassword and getSession.
  useEffect(() => {
    let mounted = true

    void supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) {
        return
      }
      setSession(initialSession)
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        markPasswordRecovery()
        setNeedsPasswordSetup(true)
      }
      if (event === 'SIGNED_OUT') {
        clearPasswordRecovery()
        setNeedsPasswordSetup(false)
      }
      setSession(nextSession)
      setAuthReady(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Load profile whenever the session changes — outside the auth listener.
  useEffect(() => {
    if (!authReady) {
      return
    }

    let cancelled = false

    void (async () => {
      setIsLoading(true)

      if (!session) {
        if (!cancelled) {
          setUser(null)
          setIsLoading(false)
        }
        return
      }

      const profile = await fetchProfile(session)

      if (cancelled) {
        return
      }

      if (!profile) {
        await supabase.auth.signOut()
        setUser(null)
      } else {
        setUser(profile)
      }

      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [session, authReady])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }

    if (!data.session) {
      throw new Error('Sign-in succeeded but no session was returned.')
    }

    const profile = await fetchProfile(data.session)
    if (!profile) {
      await supabase.auth.signOut()
      throw new Error(
        'Your account is not provisioned or has been deactivated. Contact an administrator.',
      )
    }

    setSession(data.session)
    setUser(profile)
    setIsLoading(false)
    return profile
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
    clearPasswordRecovery()
    setNeedsPasswordSetup(false)
    setSession(null)
    setUser(null)
  }, [])

  const signInWithMagicLink = useCallback(async (email: string) => {
    await invokeEdgeFunction(
      'request-seller-magic-link',
      { email: email.trim().toLowerCase() },
      'Could not send magic link.',
    )
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      throw error
    }
    clearPasswordRecovery()
    setNeedsPasswordSetup(false)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isLoading,
      needsPasswordSetup,
      signIn,
      signOut,
      signInWithMagicLink,
      updatePassword,
    }),
    [
      user,
      isLoading,
      needsPasswordSetup,
      signIn,
      signOut,
      signInWithMagicLink,
      updatePassword,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
