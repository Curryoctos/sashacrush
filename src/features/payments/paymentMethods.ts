import type { MobileMoneyNetwork } from '@/features/payments/validation'
import type { PaymentMethod } from '@/types/database'

export type PaymentChoice = 'stripe' | 'mtn' | 'airtel' | 'manual' | 'crypto'

export const GATEWAY_METHODS = new Set<PaymentMethod>(['stripe', 'flutterwave'])

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
  return GATEWAY_METHODS.has(paymentDetails(choice).method)
}

export function paymentMethodLabel(
  method: PaymentMethod | null | undefined,
  network: MobileMoneyNetwork | null | undefined,
): string {
  if (method === 'stripe') {
    return 'Card · Stripe'
  }
  if (method === 'flutterwave' && network === 'mtn') {
    return 'MTN MoMo'
  }
  if (method === 'flutterwave' && network === 'airtel') {
    return 'Airtel Money'
  }
  if (method === 'flutterwave') {
    return 'Mobile money · Flutterwave'
  }
  if (method === 'manual') {
    return 'Manual transfer'
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
      return amount ? `Pay ${amount} with card` : 'Continue to Stripe Checkout'
    case 'mtn':
      return amount ? `Pay ${amount} with MTN MoMo` : 'Continue to MTN MoMo'
    case 'airtel':
      return amount ? `Pay ${amount} with Airtel Money` : 'Continue to Airtel Money'
    case 'manual':
      return 'Record manual transfer'
    case 'crypto':
      return 'Record crypto payment'
  }
}

export function checkoutProviderHint(choice: PaymentChoice): string {
  switch (choice) {
    case 'stripe':
      return 'You will be redirected to Stripe Checkout to enter card details securely.'
    case 'mtn':
      return 'You will be redirected to Flutterwave to approve the MTN Mobile Money payment.'
    case 'airtel':
      return 'You will be redirected to Flutterwave to approve the Airtel Money payment.'
    case 'manual':
      return 'Payment stays pending until an admin confirms the bank or cash transfer.'
    case 'crypto':
      return 'Payment stays pending until conversion is verified and confirmed.'
  }
}

export function isGatewayPayment(method: PaymentMethod | null | undefined): boolean {
  return method === 'stripe' || method === 'flutterwave'
}
