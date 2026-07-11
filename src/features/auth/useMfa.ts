import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useMfaStatus() {
  const [hasVerifiedTotp, setHasVerifiedTotp] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  const refresh = useCallback(async () => {
    setIsChecking(true)
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) {
        setHasVerifiedTotp(false)
        return
      }

      const verified = data.totp.some((factor) => factor.status === 'verified')
      setHasVerifiedTotp(verified)
    } catch {
      setHasVerifiedTotp(false)
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { hasVerifiedTotp, isChecking, refresh }
}

export function useMfaAssurance() {
  const [needsChallenge, setNeedsChallenge] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  const refresh = useCallback(async () => {
    setIsChecking(true)
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (error) {
        setNeedsChallenge(false)
        return
      }

      setNeedsChallenge(
        data.currentLevel === 'aal1' && data.nextLevel === 'aal2',
      )
    } catch {
      setNeedsChallenge(false)
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { needsChallenge, isChecking, refresh }
}

export async function getVerifiedTotpFactorId(): Promise<string | null> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) {
    return null
  }

  const factor = data.totp.find((entry) => entry.status === 'verified')
  return factor?.id ?? null
}

export async function enrollTotpFactor(): Promise<{
  factorId: string
  qrCode: string
  secret: string
}> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not start MFA enrollment.')
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  }
}

export async function verifyTotpEnrollment(
  factorId: string,
  code: string,
): Promise<void> {
  await challengeAndVerifyTotp(factorId, code)
}

export async function challengeAndVerifyTotp(
  factorId: string,
  code: string,
): Promise<void> {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  })

  if (challengeError || !challenge) {
    throw new Error(challengeError?.message ?? 'Could not start MFA verification.')
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })

  if (verifyError) {
    throw new Error(verifyError.message)
  }
}
