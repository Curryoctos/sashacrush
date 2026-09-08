import type { InvestmentMethod } from '@/types/database'

export interface CreateInvestmentInput {
  amountUsd: number
  amountUgx?: number | null
  rateUsed?: number | null
  method: InvestmentMethod
  reference: string
  notes?: string | null
}

const METHODS: ReadonlySet<string> = new Set([
  'bank_transfer',
  'mobile_money',
  'other',
])

export function normalizeInvestmentReference(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function validateCreateInvestment(input: CreateInvestmentInput): string | null {
  if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
    return 'Enter a positive USD amount.'
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

  const reference = normalizeInvestmentReference(input.reference)
  if (!reference) {
    return 'Enter the bank or mobile-money reference for this transfer.'
  }

  if (reference.length < 4) {
    return 'Reference must be at least 4 characters.'
  }

  if (reference.length > 120) {
    return 'Reference must be 120 characters or fewer.'
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
    default:
      return method
  }
}
