import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { INVESTMENT_TERMS_VERSION } from '@/features/investments/terms'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/types'

const PENDING_DOC_COLUMNS =
  'id, land_id, investor_id, investment_id, uploader_id, assigned_to, signed_by, file_path, title, status, signature_hash, signed_at, created_at'

async function resolveTermsVersion(): Promise<string> {
  const { data, error } = await supabase.rpc('current_investment_terms_version')
  if (error || typeof data !== 'string' || !data.trim()) {
    return INVESTMENT_TERMS_VERSION
  }
  return data
}

export function useInvestmentAccessGate() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const executiveId = user?.id ?? null

  const termsVersionQuery = useQuery({
    queryKey: ['investment-terms-version'],
    enabled: Boolean(executiveId),
    staleTime: 60_000,
    queryFn: resolveTermsVersion,
  })

  const termsVersion = termsVersionQuery.data ?? INVESTMENT_TERMS_VERSION

  const consentQuery = useQuery({
    queryKey: ['investor-consent', executiveId, termsVersion],
    enabled: Boolean(executiveId && termsVersionQuery.isSuccess),
    queryFn: async (): Promise<{ accepted: boolean; acceptedAt: string | null }> => {
      const { data, error } = await supabase
        .from('investor_consents')
        .select('accepted_at')
        .eq('executive_id', executiveId!)
        .eq('terms_version', termsVersion)
        .maybeSingle()

      if (error) {
        throw error
      }

      return {
        accepted: Boolean(data?.accepted_at),
        acceptedAt: data?.accepted_at ?? null,
      }
    },
  })

  const pendingDocsQuery = useQuery({
    queryKey: ['investor-pending-agreements', executiveId],
    enabled: Boolean(executiveId),
    queryFn: async (): Promise<Document[]> => {
      const { data, error } = await supabase
        .from('documents')
        .select(PENDING_DOC_COLUMNS)
        .eq('investor_id', executiveId!)
        .eq('assigned_to', executiveId!)
        .eq('status', 'sent')
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return (data ?? []) as Document[]
    },
  })

  const acceptTerms = useMutation({
    mutationFn: async () => {
      if (!executiveId) {
        throw new Error('You must be signed in to accept the terms.')
      }

      const { error } = await supabase.from('investor_consents').insert({
        executive_id: executiveId,
        terms_version: termsVersion,
      })

      if (error) {
        if (error.code === '23505') {
          return
        }
        throw error
      }
    },
    onSuccess: () => {
      const acceptedAt = new Date().toISOString()
      queryClient.setQueryData(['investor-consent', executiveId, termsVersion], {
        accepted: true,
        acceptedAt,
      })
      void queryClient.invalidateQueries({
        queryKey: ['investor-consent', executiveId],
      })
    },
  })

  const refreshGate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['investor-consent', executiveId] }),
      queryClient.invalidateQueries({
        queryKey: ['investor-pending-agreements', executiveId],
      }),
      queryClient.invalidateQueries({ queryKey: ['documents', 'investor', executiveId] }),
    ])
  }, [executiveId, queryClient])

  const termsAccepted = consentQuery.data?.accepted ?? false
  const pendingAgreements = pendingDocsQuery.data ?? []
  const canContribute = termsAccepted && pendingAgreements.length === 0

  return {
    isLoading:
      termsVersionQuery.isLoading ||
      consentQuery.isLoading ||
      pendingDocsQuery.isLoading,
    error: termsVersionQuery.error ?? consentQuery.error ?? pendingDocsQuery.error,
    termsAccepted,
    termsAcceptedAt: consentQuery.data?.acceptedAt ?? null,
    pendingAgreements,
    pendingCount: pendingAgreements.length,
    canContribute,
    acceptTerms: acceptTerms.mutateAsync,
    isAccepting: acceptTerms.isPending,
    refreshGate,
    termsVersion,
  }
}
