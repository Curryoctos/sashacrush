import type { PaymentMethod } from '@/types/database'

export type MobileMoneyNetwork = 'mtn' | 'airtel'

export interface CreatePaymentInput {
  landId: string
  amountUsd: number
  amountUgx?: number | null
  method?: PaymentMethod
  mobileMoneyNetwork?: MobileMoneyNetwork | null
  /** Seller MoMo receive number (stored as payments.payer_phone). */
  recipientPhone?: string | null
  /** @deprecated Use recipientPhone */
  payerPhone?: string | null
  manualReference?: string | null
  rateUsed?: number | null
  /** Deal total — used for soft-cap checks when provided */
  totalValueUsd?: number | null
  /**
   * Amount still open for new payouts (outstanding − pending).
   */
  availableToPayOutUsd?: number | null
  /** @deprecated Prefer availableToPayOutUsd */
  availableToCollectUsd?: number | null
  /** @deprecated Prefer availableToPayOutUsd */
  remainingOutstandingUsd?: number | null
}

const UGANDA_PHONE = /^(?:\+?256|0)(7\d{8})$/

export function normalizeUgandaPhone(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, '').trim()
  const match = UGANDA_PHONE.exec(digits)
  if (!match) {
    return null
  }
  return `+256${match[1]}`
}

export function resolveRecipientPhone(input: CreatePaymentInput): string | null {
  const raw = input.recipientPhone ?? input.payerPhone ?? null
  return raw?.trim() ? raw.trim() : null
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

  if (input.method === 'crypto') {
    return 'Crypto payouts are not available yet. Use mobile money or manual transfer.'
  }

  if (input.method === 'stripe') {
    return 'Card payouts are not available. Use MTN/Airtel MoMo or manual transfer.'
  }

  if (input.method === 'flutterwave' && !input.mobileMoneyNetwork) {
    return 'Choose MTN MoMo or Airtel Money.'
  }

  if (input.method === 'flutterwave' && input.amountUgx == null) {
    return 'Enter the UGX amount for the mobile-money payout.'
  }

  if (input.method === 'flutterwave') {
    const phone = resolveRecipientPhone(input)
    if (!phone) {
      return 'Enter the seller’s mobile money phone number.'
    }
    if (!normalizeUgandaPhone(phone)) {
      return 'Enter a valid Uganda phone number (e.g. 07XXXXXXXX or +2567XXXXXXXX).'
    }
  }

  if (input.method !== 'flutterwave' && input.mobileMoneyNetwork) {
    return 'Mobile-money network is only valid for Flutterwave payouts.'
  }

  if (input.method === 'manual' && !input.manualReference?.trim()) {
    return 'Manual payout requires a reconciliation reference.'
  }

  if (
    input.totalValueUsd != null &&
    Number.isFinite(input.totalValueUsd) &&
    input.amountUsd > Number(input.totalValueUsd)
  ) {
    return `Amount exceeds deal total of $${Number(input.totalValueUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}.`
  }

  const available =
    input.availableToPayOutUsd ??
    input.availableToCollectUsd ??
    input.remainingOutstandingUsd ??
    null

  if (
    available != null &&
    Number.isFinite(available) &&
    input.amountUsd > Number(available)
  ) {
    return `Amount exceeds available-to-pay-out balance of $${Number(available).toLocaleString('en-US', { minimumFractionDigits: 2 })} (outstanding minus pending).`
  }

  return null
}
