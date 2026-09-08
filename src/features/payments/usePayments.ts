import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { confirmPaymentWithReceipt } from '@/features/payments/confirmPayment'
import { initiateGatewayPayment } from '@/features/payments/initiateGatewayPayment'
import {
  normalizeUgandaPhone,
  resolveRecipientPhone,
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
  rate_used: number | null
  method: PaymentMethod | null
  status: string
  stripe_payment_intent_id: string | null
  flutterwave_tx_ref: string | null
  gateway_checkout_url: string | null
  mobile_money_network: 'mtn' | 'airtel' | null
  manual_reference: string | null
  payer_phone: string | null
  created_at: string
  receipt_number: string | null
  pdf_path: string | null
}

const PAYMENT_COLUMNS =
  'id, land_id, amount_usd, amount_ugx, rate_used, method, status, stripe_payment_intent_id, flutterwave_tx_ref, gateway_checkout_url, mobile_money_network, manual_reference, payer_phone, created_at'

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

  const paymentIds = (payments ?? []).map((payment) => payment.id)
  const receiptByPayment = new Map<string, { receipt_number: string; pdf_path: string | null }>()

  if (paymentIds.length > 0) {
    const { data: receipts } = await supabase
      .from('receipts')
      .select('payment_id, receipt_number, pdf_path')
      .in('payment_id', paymentIds)

    for (const receipt of receipts ?? []) {
      receiptByPayment.set(receipt.payment_id, {
        receipt_number: receipt.receipt_number,
        pdf_path: receipt.pdf_path,
      })
    }
  }

  return (payments ?? []).map((payment) => {
    const receipt = receiptByPayment.get(payment.id)
    return {
      ...payment,
      land_title: landTitles.get(payment.land_id) ?? 'Unknown property',
      receipt_number: receipt?.receipt_number ?? null,
      pdf_path: receipt?.pdf_path ?? null,
    }
  })
}

function invalidatePaymentQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['payments'] })
  void queryClient.invalidateQueries({ queryKey: ['receipts'] })
  void queryClient.invalidateQueries({ queryKey: ['deal-summary'] })
  void queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
  void queryClient.invalidateQueries({ queryKey: ['company-capital'] })
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

      if (payment.status === 'failed') {
        throw new Error('This payout failed. Create a new payout to try again.')
      }

      return confirmPaymentWithReceipt(paymentId)
    },
    onSuccess: () => {
      invalidatePaymentQueries(queryClient)
    },
  })

  const createPayment = useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      const validationError = validateCreatePayment(input)
      if (validationError) {
        throw new Error(validationError)
      }

      const method = input.method ?? 'manual'
      const status = method === 'manual' ? 'pending_manual' : 'pending'
      const rawPhone = resolveRecipientPhone(input)
      const recipientPhone = rawPhone ? normalizeUgandaPhone(rawPhone) ?? rawPhone : null

      const { data, error } = await supabase
        .from('payments')
        .insert({
          land_id: input.landId,
          amount_usd: input.amountUsd,
          amount_ugx: input.amountUgx ?? null,
          rate_used: input.rateUsed ?? null,
          method,
          mobile_money_network: input.mobileMoneyNetwork ?? null,
          manual_reference: input.manualReference ?? null,
          payer_phone: recipientPhone,
          status,
        })
        .select(PAYMENT_COLUMNS)
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? 'Could not record payment.')
      }

      return data
    },
    onSuccess: () => {
      invalidatePaymentQueries(queryClient)
    },
  })

  const startGatewayPayout = useMutation({
    // The newly inserted payment may not be in the query cache yet. The edge
    // function is authoritative and validates status + gateway method.
    mutationFn: initiateGatewayPayment,
    onSuccess: () => {
      invalidatePaymentQueries(queryClient)
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
    startGatewayPayout: startGatewayPayout.mutateAsync,
    isStartingPayout: startGatewayPayout.isPending,
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  }
}

export function usePayments(landId: string | null) {
  const all = useAllPayments()

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
    startGatewayPayout: all.startGatewayPayout,
    isStartingPayout: all.isStartingPayout,
    refresh: all.refresh,
  }
}
