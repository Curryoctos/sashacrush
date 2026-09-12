import type { MobileMoneyNetwork } from '@/features/payments/validation'
import type { PaymentMethod } from '@/types/database'

export type PaymentChoice = 'stripe' | 'mtn' | 'airtel' | 'manual' | 'crypto'

/** Methods that call initiate-gateway-payment (Flutterwave MoMo payout). */
export const GATEWAY_PAYOUT_METHODS = new Set<PaymentMethod>(['flutterwave'])

/** @deprecated Use GATEWAY_PAYOUT_METHODS — Stripe checkout collect-in is retired. */
export const GATEWAY_METHODS = GATEWAY_PAYOUT_METHODS

export function paymentDetails(choice: PaymentChoice): {
  method: PaymentMethod
  network: MobileMoneyNetwork | null
} {
  if (choice === 'mtn' || choice === 'airtel') {
    return { method: 'flutterwave', network: choice }
  }

  return { method: choice, network: null }
}

export function isGatewayChoice(choice: PaymentChoice): boolean {
  return GATEWAY_PAYOUT_METHODS.has(paymentDetails(choice).method)
}

export function paymentMethodLabel(
  method: PaymentMethod | null | undefined,
  network: MobileMoneyNetwork | null | undefined,
): string {
  if (method === 'stripe') {
    return 'Card · Stripe (retired)'
  }
  if (method === 'flutterwave' && network === 'mtn') {
    return 'MTN MoMo payout'
  }
  if (method === 'flutterwave' && network === 'airtel') {
    return 'Airtel Money payout'
  }
  if (method === 'flutterwave') {
    return 'Mobile money payout'
  }
  if (method === 'manual') {
    return 'Manual payout'
  }
  if (method === 'crypto') {
    return 'Crypto'
  }
  return '—'
}

export function checkoutCtaLabel(choice: PaymentChoice, amountUsd: number | null): string {
  const amount =
    amountUsd != null && Number.isFinite(amountUsd) && amountUsd > 0
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
        }).format(amountUsd)
      : null

  switch (choice) {
    case 'stripe':
      return 'Card payouts not available'
    case 'mtn':
      return amount ? `Pay out ${amount} via MTN MoMo` : 'Send MTN MoMo payout'
    case 'airtel':
      return amount ? `Pay out ${amount} via Airtel Money` : 'Send Airtel Money payout'
    case 'manual':
      return 'Create manual payout + reference'
    case 'crypto':
      return 'Crypto coming soon'
  }
}

export function checkoutProviderHint(choice: PaymentChoice): string {
  switch (choice) {
    case 'stripe':
      return 'Card payouts to sellers are not enabled. Use MoMo or manual transfer.'
    case 'mtn':
      return 'Sends UGX from the company Flutterwave balance to the seller’s MTN MoMo wallet.'
    case 'airtel':
      return 'Sends UGX from the company Flutterwave balance to the seller’s Airtel Money wallet.'
    case 'manual':
      return 'Creates a pending_manual record with a unique WU reference for the cash/wire payout. Confirm after the seller is paid.'
    case 'crypto':
      return 'Wallet payouts are planned for a later phase. Use MoMo or manual for now.'
  }
}

export function isGatewayPayment(method: PaymentMethod | null | undefined): boolean {
  return method === 'flutterwave'
}

/** Provider-verified rails — staff must not manually confirm these. */
export function requiresProviderConfirm(method: PaymentMethod | null | undefined): boolean {
  return method === 'flutterwave' || method === 'stripe'
}

export function isAwaitingManualConfirm(status: string, method: PaymentMethod | null): boolean {
  return (
    (status === 'pending' || status === 'pending_manual') &&
    (method === 'manual' || method === 'crypto')
  )
}

/** Staff can confirm only offline rails (manual / crypto), never Flutterwave/Stripe. */
export function isConfirmablePending(
  status: string,
  method: PaymentMethod | null | undefined,
): boolean {
  if (status !== 'pending' && status !== 'pending_manual') {
    return false
  }
  return !requiresProviderConfirm(method)
}
