import type { PaymentMethod } from '@/types/database'

export interface CreatePaymentInput {
  landId: string
  amountUsd: number
  amountUgx?: number | null
  method?: PaymentMethod
}

export function validateCreatePayment(input: CreatePaymentInput): string | null {
  if (!input.landId.trim()) {
    return 'Select a land record.'
  }

  if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
    return 'Enter a positive USD amount.'
  }

  if (
    input.amountUgx != null &&
    (!Number.isFinite(input.amountUgx) || input.amountUgx <= 0)
  ) {
    return 'UGX amount must be positive when provided.'
  }

  return null
}
