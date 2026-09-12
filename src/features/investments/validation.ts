import type { InvestmentMethod } from '@/types/database'

export interface CreateInvestmentInput {
  amountUsd: number
  amountUgx?: number | null
  rateUsed?: number | null
  method: InvestmentMethod
  /** Required for offline methods; ignored for Stripe (server generates). */
  reference?: string | null
  notes?: string | null
}

const OFFLINE_METHODS: ReadonlySet<string> = new Set([
  'bank_transfer',
  'mobile_money',
  'other',
])

const METHODS: ReadonlySet<string> = new Set([...OFFLINE_METHODS, 'stripe'])

export function isStripeInvestmentMethod(method: InvestmentMethod | string): boolean {
  return method === 'stripe'
}

export function normalizeInvestmentReference(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function validateCreateInvestment(input: CreateInvestmentInput): string | null {
  if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
    return 'Enter a positive USD amount.'
  }

  if (input.method === 'stripe' && input.amountUsd < 0.5) {
    return 'Card contributions must be at least $0.50.'
  }

  if (
    input.amountUgx != null &&
    (!Number.isFinite(input.amountUgx) || input.amountUgx <= 0)
  ) {
    return 'UGX amount must be positive when provided.'
  }

  if (!METHODS.has(input.method)) {
    return 'Choose a valid payment method.'
  }

  if (input.method !== 'stripe') {
    const reference = normalizeInvestmentReference(input.reference ?? '')
    if (!reference) {
      return 'Enter the bank or mobile-money reference for this transfer.'
    }

    if (reference.length < 4) {
      return 'Reference must be at least 4 characters.'
    }

    if (reference.length > 120) {
      return 'Reference must be 120 characters or fewer.'
    }
  }

  if (input.notes != null && input.notes.trim().length > 1000) {
    return 'Notes must be 1000 characters or fewer.'
  }

  return null
}

export function investmentMethodLabel(method: InvestmentMethod | string): string {
  switch (method) {
    case 'bank_transfer':
      return 'Bank transfer'
    case 'mobile_money':
      return 'Mobile money'
    case 'other':
      return 'Other'
    case 'stripe':
      return 'Card (Stripe)'
    default:
      return method
  }
}
