import { describe, expect, it } from 'vitest'
import {
  checkoutCtaLabel,
  isConfirmablePending,
  isGatewayChoice,
  paymentDetails,
  paymentMethodLabel,
  requiresProviderConfirm,
} from '@/features/payments/paymentMethods'

describe('paymentMethods', () => {
  it('maps MTN/Airtel choices to Flutterwave + network', () => {
    expect(paymentDetails('mtn')).toEqual({ method: 'flutterwave', network: 'mtn' })
    expect(paymentDetails('airtel')).toEqual({ method: 'flutterwave', network: 'airtel' })
    expect(paymentDetails('stripe')).toEqual({ method: 'stripe', network: null })
  })

  it('flags gateway payout choices (MoMo only)', () => {
    expect(isGatewayChoice('stripe')).toBe(false)
    expect(isGatewayChoice('mtn')).toBe(true)
    expect(isGatewayChoice('manual')).toBe(false)
  })

  it('labels methods for history rows', () => {
    expect(paymentMethodLabel('stripe', null)).toBe('Card · Stripe (retired)')
    expect(paymentMethodLabel('flutterwave', 'mtn')).toBe('MTN MoMo payout')
    expect(paymentMethodLabel('manual', null)).toBe('Manual payout')
  })

  it('builds payout CTAs with amount', () => {
    expect(checkoutCtaLabel('stripe', 1500)).toBe('Card payouts not available')
    expect(checkoutCtaLabel('mtn', null)).toBe('Send MTN MoMo payout')
    expect(checkoutCtaLabel('mtn', 1500)).toBe('Pay out $1,500.00 via MTN MoMo')
    expect(checkoutCtaLabel('manual', 100)).toBe('Create manual payout + reference')
    expect(checkoutCtaLabel('crypto', 100)).toBe('Crypto coming soon')
  })

  it('blocks staff confirm for Flutterwave/Stripe; allows manual/crypto', () => {
    expect(requiresProviderConfirm('flutterwave')).toBe(true)
    expect(requiresProviderConfirm('stripe')).toBe(true)
    expect(requiresProviderConfirm('manual')).toBe(false)
    expect(isConfirmablePending('pending', 'flutterwave')).toBe(false)
    expect(isConfirmablePending('pending', 'stripe')).toBe(false)
    expect(isConfirmablePending('pending_manual', 'manual')).toBe(true)
    expect(isConfirmablePending('pending', 'crypto')).toBe(true)
    expect(isConfirmablePending('confirmed', 'manual')).toBe(false)
  })
})
