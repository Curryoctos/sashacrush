import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { confirmPaymentWithReceipt } from '@/features/payments/confirmPayment'
import {
  validateCreatePayment,
  type CreatePaymentInput,
} from '@/features/payments/validation'
import { supabase } from '@/lib/supabase'
import type { PaymentMethod } from '@/types/database'

export interface PaymentWithLand {
  id: string
  land_id: string
  land_title: string
  amount_usd: number
  amount_ugx: number | null
  method: PaymentMethod | null
  status: string
  created_at: string
}

const PAYMENT_COLUMNS =
  'id, land_id, amount_usd, amount_ugx, method, status, created_at'

async function fetchPaymentsWithLand(): Promise<PaymentWithLand[]> {
  const { data: payments, error } = await supabase
    .from('payments')
    .select(PAYMENT_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const landIds = [...new Set((payments ?? []).map((payment) => payment.land_id))]
  const landTitles = new Map<string, string>()

  if (landIds.length > 0) {
    const { data: lands } = await supabase
      .from('land_records')
      .select('id, title')
      .in('id', landIds)

    for (const land of lands ?? []) {
      landTitles.set(land.id, land.title)
    }
  }

  return (payments ?? []).map((payment) => ({
    ...payment,
    land_title: landTitles.get(payment.land_id) ?? 'Unknown property',
  }))
}

export function useAllPayments() {
  const queryClient = useQueryClient()

  const paymentsQuery = useQuery({
    queryKey: ['payments', 'all'],
    queryFn: fetchPaymentsWithLand,
  })

  const confirmPayment = useMutation({
    mutationFn: async (paymentId: string) => {
      const payment = paymentsQuery.data?.find((row) => row.id === paymentId)
      if (!payment) {
        throw new Error('Payment not found.')
      }

      if (payment.status === 'confirmed') {
        throw new Error('Payment is already confirmed.')
      }

      return confirmPaymentWithReceipt({
        paymentId,
        landId: payment.land_id,
        amountUsd: payment.amount_usd,
        amountUgx: payment.amount_ugx,
        method: payment.method,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] })
      void queryClient.invalidateQueries({ queryKey: ['receipts'] })
    },
  })

  const createPayment = useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      const validationError = validateCreatePayment(input)
      if (validationError) {
        throw new Error(validationError)
      }

      const { data, error } = await supabase
        .from('payments')
        .insert({
          land_id: input.landId,
          amount_usd: input.amountUsd,
          amount_ugx: input.amountUgx ?? null,
          method: input.method ?? 'manual',
          status: 'pending',
        })
        .select(PAYMENT_COLUMNS)
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? 'Could not record payment.')
      }

      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  })

  return {
    payments: paymentsQuery.data ?? [],
    isLoading: paymentsQuery.isLoading,
    error: paymentsQuery.error,
    confirmPayment: confirmPayment.mutateAsync,
    isConfirming: confirmPayment.isPending,
    createPayment: createPayment.mutateAsync,
    isCreating: createPayment.isPending,
  }
}

export function usePayments(landId: string | null) {
  const all = useAllPayments()
  const queryClient = useQueryClient()

  return {
    payments: landId
      ? all.payments.filter((payment) => payment.land_id === landId)
      : all.payments,
    isLoading: all.isLoading,
    error: all.error,
    confirmPayment: all.confirmPayment,
    isConfirming: all.isConfirming,
    createPayment: all.createPayment,
    isCreating: all.isCreating,
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  }
}
