import type { PaymentMethod } from '@/types/database'

export type MobileMoneyNetwork = 'mtn' | 'airtel'

export interface CreatePaymentInput {
  landId: string
  amountUsd: number
  amountUgx?: number | null
  method?: PaymentMethod
  mobileMoneyNetwork?: MobileMoneyNetwork | null
  /** Deal total — used for soft-cap checks when provided */
  totalValueUsd?: number | null
  /** Remaining outstanding (total − confirmed). Preferred over total when set. */
  remainingOutstandingUsd?: number | null
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

  if (input.method === 'flutterwave' && !input.mobileMoneyNetwork) {
    return 'Choose MTN MoMo or Airtel Money.'
  }

  if (input.method === 'flutterwave' && input.amountUgx == null) {
    return 'Enter the UGX amount for mobile-money checkout.'
  }

  if (input.method !== 'flutterwave' && input.mobileMoneyNetwork) {
    return 'Mobile-money network is only valid for Flutterwave payments.'
  }

  if (
    input.totalValueUsd != null &&
    Number.isFinite(input.totalValueUsd) &&
    input.amountUsd > Number(input.totalValueUsd)
  ) {
    return `Amount exceeds deal total of $${Number(input.totalValueUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}.`
  }

  if (
    input.remainingOutstandingUsd != null &&
    Number.isFinite(input.remainingOutstandingUsd) &&
    input.amountUsd > Number(input.remainingOutstandingUsd)
  ) {
    return `Amount exceeds remaining outstanding balance of $${Number(input.remainingOutstandingUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}.`
  }

  return null
}
