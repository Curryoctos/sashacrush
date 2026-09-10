import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { computeCompanyCapital } from '@/features/investments/companyCapital'
import { initiateInvestmentCheckout } from '@/features/investments/initiateInvestmentCheckout'
import {
  isStripeInvestmentMethod,
  normalizeInvestmentReference,
  validateCreateInvestment,
  type CreateInvestmentInput,
} from '@/features/investments/validation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Investment, InvestmentStatus } from '@/types/database'

const INVESTMENT_COLUMNS =
  'id, executive_id, amount_usd, amount_ugx, rate_used, method, reference, notes, status, confirmed_by, confirmed_at, rejection_reason, stripe_checkout_session_id, stripe_payment_intent_id, created_at, updated_at'

export interface InvestmentWithExecutive extends Investment {
  executive_email: string | null
  executive_name: string | null
}

function invalidateInvestmentQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['investments'] })
  void queryClient.invalidateQueries({ queryKey: ['company-capital'] })
  void queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
}

async function fetchInvestmentsForExecutive(executiveId: string): Promise<Investment[]> {
  const { data, error } = await supabase
    .from('investments')
    .select(INVESTMENT_COLUMNS)
    .eq('executive_id', executiveId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as Investment[]
}

async function fetchAllInvestments(): Promise<InvestmentWithExecutive[]> {
  const { data: investments, error } = await supabase
    .from('investments')
    .select(INVESTMENT_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const rows = (investments ?? []) as Investment[]
  const executiveIds = [...new Set(rows.map((row) => row.executive_id))]
  const names = new Map<string, { email: string | null; full_name: string | null }>()

  if (executiveIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, email, full_name')
      .in('id', executiveIds)

    for (const user of users ?? []) {
      names.set(user.id, { email: user.email, full_name: user.full_name })
    }
  }

  return rows.map((row) => {
    const executive = names.get(row.executive_id)
    return {
      ...row,
      executive_email: executive?.email ?? null,
      executive_name: executive?.full_name ?? null,
    }
  })
}

export function useMyInvestments() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const executiveId = user?.id ?? null

  const investmentsQuery = useQuery({
    queryKey: ['investments', 'mine', executiveId],
    enabled: Boolean(executiveId),
    queryFn: () => fetchInvestmentsForExecutive(executiveId!),
  })

  const createInvestment = useMutation({
    mutationFn: async (input: CreateInvestmentInput) => {
      if (!executiveId) {
        throw new Error('You must be signed in to submit an investment.')
      }

      const validationError = validateCreateInvestment(input)
      if (validationError) {
        throw new Error(validationError)
      }

      if (input.method === 'stripe') {
        const checkout = await initiateInvestmentCheckout({
          amountUsd: input.amountUsd,
          notes: input.notes?.trim() || null,
        })
        window.location.assign(checkout.checkoutUrl)
        return { redirected: true as const, investmentId: checkout.investmentId }
      }

      const { data, error } = await supabase
        .from('investments')
        .insert({
          executive_id: executiveId,
          amount_usd: input.amountUsd,
          amount_ugx: input.amountUgx ?? null,
          rate_used: input.rateUsed ?? null,
          method: input.method,
          reference: normalizeInvestmentReference(input.reference ?? ''),
          notes: input.notes?.trim() || null,
          status: 'pending',
        })
        .select(INVESTMENT_COLUMNS)
        .single()

      if (error || !data) {
        if (error?.code === '23505') {
          throw new Error('That payment reference was already used. Enter a unique reference.')
        }
        throw new Error(error?.message ?? 'Could not submit investment.')
      }

      return data as Investment
    },
    onSuccess: (result) => {
      if (result && typeof result === 'object' && 'redirected' in result && result.redirected) {
        return
      }
      invalidateInvestmentQueries(queryClient)
    },
  })

  const confirmedTotalUsd = useMemo(() => {
    return (investmentsQuery.data ?? [])
      .filter((row) => row.status === 'confirmed')
      .reduce((sum, row) => sum + Number(row.amount_usd), 0)
  }, [investmentsQuery.data])

  return {
    investments: investmentsQuery.data ?? [],
    confirmedTotalUsd,
    isLoading: investmentsQuery.isLoading,
    error: investmentsQuery.error,
    createInvestment: createInvestment.mutateAsync,
    isCreating: createInvestment.isPending,
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ['investments', 'mine'] })
    },
  }
}

export function useAdminInvestments(statusFilter?: InvestmentStatus | 'all') {
  const queryClient = useQueryClient()

  const investmentsQuery = useQuery({
    queryKey: ['investments', 'admin'],
    queryFn: fetchAllInvestments,
  })

  const confirmInvestment = useMutation({
    mutationFn: async (investmentId: string) => {
      const row = investmentsQuery.data?.find((item) => item.id === investmentId)
      if (row && isStripeInvestmentMethod(row.method)) {
        throw new Error(
          'Card contributions confirm automatically when Stripe reports payment success.',
        )
      }

      const { data, error } = await supabase
        .from('investments')
        .update({ status: 'confirmed' })
        .eq('id', investmentId)
        .eq('status', 'pending')
        .select(INVESTMENT_COLUMNS)
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? 'Could not confirm investment.')
      }

      return data as Investment
    },
    onSuccess: () => {
      invalidateInvestmentQueries(queryClient)
    },
  })

  const rejectInvestment = useMutation({
    mutationFn: async ({
      investmentId,
      reason,
    }: {
      investmentId: string
      reason?: string | null
    }) => {
      const { data, error } = await supabase
        .from('investments')
        .update({
          status: 'rejected',
          rejection_reason: reason?.trim() || null,
        })
        .eq('id', investmentId)
        .eq('status', 'pending')
        .select(INVESTMENT_COLUMNS)
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? 'Could not reject investment.')
      }

      return data as Investment
    },
    onSuccess: () => {
      invalidateInvestmentQueries(queryClient)
    },
  })

  const investments = useMemo(() => {
    const rows = investmentsQuery.data ?? []
    if (!statusFilter || statusFilter === 'all') {
      return rows
    }
    return rows.filter((row) => row.status === statusFilter)
  }, [investmentsQuery.data, statusFilter])

  const pending = useMemo(
    () => (investmentsQuery.data ?? []).filter((row) => row.status === 'pending'),
    [investmentsQuery.data],
  )

  return {
    investments,
    allInvestments: investmentsQuery.data ?? [],
    pending,
    isLoading: investmentsQuery.isLoading,
    error: investmentsQuery.error,
    confirmInvestment: confirmInvestment.mutateAsync,
    isConfirming: confirmInvestment.isPending,
    rejectInvestment: rejectInvestment.mutateAsync,
    isRejecting: rejectInvestment.isPending,
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ['investments', 'admin'] })
    },
  }
}

export function useCompanyCapital() {
  const capitalQuery = useQuery({
    queryKey: ['company-capital'],
    queryFn: async () => {
      const [{ data: investments, error: investmentsError }, { data: payments, error: paymentsError }] =
        await Promise.all([
          supabase.from('investments').select('amount_usd, status'),
          supabase.from('payments').select('amount_usd, status'),
        ])

      if (investmentsError) {
        throw investmentsError
      }
      if (paymentsError) {
        throw paymentsError
      }

      return computeCompanyCapital(investments ?? [], payments ?? [])
    },
  })

  return {
    capital: capitalQuery.data ?? null,
    isLoading: capitalQuery.isLoading,
    error: capitalQuery.error,
  }
}
