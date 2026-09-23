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
  'id, agent_id, land_id, amount_usd, amount_ugx, rate_used, method, reference, notes, status, confirmed_by, confirmed_at, rejection_reason, stripe_checkout_session_id, stripe_payment_intent_id, created_at, updated_at'

export interface InvestmentWithMeta extends Investment {
  agent_email: string | null
  agent_name: string | null
  land_title: string | null
}

function invalidateInvestmentQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['investments'] })
  void queryClient.invalidateQueries({ queryKey: ['company-capital'] })
  void queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
}

async function attachMeta(rows: Investment[]): Promise<InvestmentWithMeta[]> {
  const agentIds = [...new Set(rows.map((row) => row.agent_id))]
  const landIds = [...new Set(rows.map((row) => row.land_id))]
  const agents = new Map<string, { email: string | null; full_name: string | null }>()
  const lands = new Map<string, string>()

  if (agentIds.length > 0) {
    const { data } = await supabase
      .from('users')
      .select('id, email, full_name')
      .in('id', agentIds)
    for (const user of data ?? []) {
      agents.set(user.id, { email: user.email, full_name: user.full_name })
    }
  }

  if (landIds.length > 0) {
    const { data } = await supabase.from('land_records').select('id, title').in('id', landIds)
    for (const land of data ?? []) {
      lands.set(land.id, land.title)
    }
  }

  return rows.map((row) => {
    const agent = agents.get(row.agent_id)
    return {
      ...row,
      agent_email: agent?.email ?? null,
      agent_name: agent?.full_name ?? null,
      land_title: lands.get(row.land_id) ?? null,
    }
  })
}

async function fetchInvestmentsForAgent(agentId: string): Promise<InvestmentWithMeta[]> {
  const { data, error } = await supabase
    .from('investments')
    .select(INVESTMENT_COLUMNS)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return attachMeta((data ?? []) as Investment[])
}

async function fetchAllInvestments(): Promise<InvestmentWithMeta[]> {
  const { data, error } = await supabase
    .from('investments')
    .select(INVESTMENT_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return attachMeta((data ?? []) as Investment[])
}

export function useMyInvestments() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const agentId = user?.id ?? null

  const investmentsQuery = useQuery({
    queryKey: ['investments', 'mine', agentId],
    enabled: Boolean(agentId),
    queryFn: () => fetchInvestmentsForAgent(agentId!),
  })

  const createInvestment = useMutation({
    mutationFn: async (input: CreateInvestmentInput) => {
      if (!agentId) {
        throw new Error('You must be signed in to submit an investment.')
      }

      const validationError = validateCreateInvestment(input)
      if (validationError) {
        throw new Error(validationError)
      }

      if (input.method === 'stripe') {
        const checkout = await initiateInvestmentCheckout({
          landId: input.landId,
          amountUsd: input.amountUsd,
          notes: input.notes?.trim() || null,
        })
        window.location.assign(checkout.checkoutUrl)
        return { redirected: true as const, investmentId: checkout.investmentId }
      }

      const { data, error } = await supabase
        .from('investments')
        .insert({
          agent_id: agentId,
          land_id: input.landId,
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

  const cancelStripeCheckout = useMutation({
    mutationFn: async (investmentId: string) => {
      if (!agentId) {
        throw new Error('You must be signed in to cancel checkout.')
      }

      const { data, error } = await supabase
        .from('investments')
        .update({
          status: 'rejected',
          rejection_reason: 'Stripe Checkout cancelled by agent',
        })
        .eq('id', investmentId)
        .eq('agent_id', agentId)
        .eq('status', 'pending')
        .eq('method', 'stripe')
        .select(INVESTMENT_COLUMNS)
        .maybeSingle()

      if (error) {
        throw new Error(error.message || 'Could not cancel checkout.')
      }

      return data as Investment | null
    },
    onSuccess: () => {
      invalidateInvestmentQueries(queryClient)
    },
  })

  return {
    investments: investmentsQuery.data ?? [],
    confirmedTotalUsd,
    isLoading: investmentsQuery.isLoading,
    error: investmentsQuery.error,
    createInvestment: createInvestment.mutateAsync,
    isCreating: createInvestment.isPending,
    cancelStripeCheckout: cancelStripeCheckout.mutateAsync,
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
          'Card investments confirm automatically when Stripe reports payment success.',
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

/** Active deals agents can invest toward. */
export function useInvestableDeals() {
  return useQuery({
    queryKey: ['land-records', 'investable'],
    queryFn: async (): Promise<Array<{ id: string; title: string; total_value_usd: number }>> => {
      const { data, error } = await supabase
        .from('land_records')
        .select('id, title, total_value_usd')
        .neq('status', 'archived')
        .order('title', { ascending: true })

      if (error) {
        throw error
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        total_value_usd: Number(row.total_value_usd),
      }))
    },
  })
}
