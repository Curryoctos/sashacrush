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
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const applySession = useCallback(async (session: Session | null) => {
    if (!session) {
      setUser(null)
      return
    }

    const profile = await fetchProfile(session)
    if (!profile) {
      await supabase.auth.signOut()
      setUser(null)
      return
    }

    setUser(profile)
  }, [])

  useEffect(() => {
    let mounted = true

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (mounted) {
        await applySession(session)
        setIsLoading(false)
      }
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [applySession])

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

    setUser(profile)
    return profile
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
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
