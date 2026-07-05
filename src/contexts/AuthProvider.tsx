import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import type { AuthUser, UserRole } from '@/types'

interface AuthProviderProps {
  children: ReactNode
}

async function fetchProfile(session: Session): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', session.user.id)
    .single()

  if (error || !data) {
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
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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
        'Your account is not provisioned. Contact an administrator.',
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
    setSession(null)
    setUser(null)
  }, [])

  const signInWithMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/seller/dashboard`,
      },
    })

    if (error) {
      throw error
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isLoading,
      signIn,
      signOut,
      signInWithMagicLink,
    }),
    [user, isLoading, signIn, signOut, signInWithMagicLink],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
