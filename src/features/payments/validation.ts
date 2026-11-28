import { capitalShortfallWarning } from '@/features/investments/companyCapital'
import type { PaymentMethod } from '@/types/database'

export type MobileMoneyNetwork = 'mtn' | 'airtel'

export interface CreatePaymentInput {
  /** Required project this purchase/disbursement is for. */
  projectId: string
  /** Optional land linkage when the project is a land acquisition. */
  landId?: string | null
  /** Why funds are being disbursed (required). */
  disbursementReason: string
  amountUsd: number
  amountUgx?: number | null
  method?: PaymentMethod
  mobileMoneyNetwork?: MobileMoneyNetwork | null
  /** Payee MoMo receive number (stored as payments.payer_phone). */
  recipientPhone?: string | null
  /** @deprecated Use recipientPhone */
  payerPhone?: string | null
  manualReference?: string | null
  rateUsed?: number | null
  /** Project funding goal — soft-cap checks when provided */
  totalValueUsd?: number | null
  /**
   * Amount still open for new payouts (outstanding − pending).
   */
  availableToPayOutUsd?: number | null
  /** @deprecated Prefer availableToPayOutUsd */
  availableToCollectUsd?: number | null
  /** @deprecated Prefer availableToPayOutUsd */
  remainingOutstandingUsd?: number | null
  /** Company capital available (raised − disbursed). Hard-blocks when exceeded. */
  companyCapitalAvailableUsd?: number | null
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

export function normalizeDisbursementReason(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim()
}

export function validateCreatePayment(input: CreatePaymentInput): string | null {
  const projectId = input.projectId?.trim() || null
  if (!projectId) {
    return 'Select a funding project.'
  }

  const reason = normalizeDisbursementReason(input.disbursementReason)
  if (reason.length < 3) {
    return 'Enter a disbursement reason (at least 3 characters).'
  }
  if (reason.length > 500) {
    return 'Disbursement reason must be 500 characters or fewer.'
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

  if (input.method === 'stripe') {
    return 'Card payouts are not available. Use MTN/Airtel MoMo or manual transfer.'
  }

  if (input.method === 'crypto' && !input.manualReference?.trim()) {
    return 'Crypto conversion requires an on-chain transaction reference.'
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
      return 'Enter the payee’s mobile money phone number.'
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
    return `Amount exceeds project funding goal of $${Number(input.totalValueUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}.`
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

  if (
    input.companyCapitalAvailableUsd != null &&
    Number.isFinite(input.companyCapitalAvailableUsd)
  ) {
    const capitalMessage = capitalShortfallWarning(
      Number(input.companyCapitalAvailableUsd),
      input.amountUsd,
    )
    if (capitalMessage) {
      return capitalMessage
    }
  }

  return null
}
