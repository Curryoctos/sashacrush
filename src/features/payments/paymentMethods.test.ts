import { describe, expect, it } from 'vitest'
import {
  checkoutCtaLabel,
  isGatewayChoice,
  paymentDetails,
  paymentMethodLabel,
} from '@/features/payments/paymentMethods'

describe('paymentMethods', () => {
  it('maps MTN/Airtel choices to Flutterwave + network', () => {
    expect(paymentDetails('mtn')).toEqual({ method: 'flutterwave', network: 'mtn' })
    expect(paymentDetails('airtel')).toEqual({ method: 'flutterwave', network: 'airtel' })
    expect(paymentDetails('stripe')).toEqual({ method: 'stripe', network: null })
  })

  it('flags gateway choices', () => {
    expect(isGatewayChoice('stripe')).toBe(true)
    expect(isGatewayChoice('mtn')).toBe(true)
    expect(isGatewayChoice('manual')).toBe(false)
  })

  it('labels methods for history rows', () => {
    expect(paymentMethodLabel('stripe', null)).toBe('Card · Stripe')
    expect(paymentMethodLabel('flutterwave', 'mtn')).toBe('MTN MoMo')
    expect(paymentMethodLabel('manual', null)).toBe('Manual transfer')
  })

  it('builds pay CTAs with amount', () => {
    expect(checkoutCtaLabel('stripe', 1500)).toBe('Pay $1,500.00 with card')
    expect(checkoutCtaLabel('mtn', null)).toBe('Continue to MTN MoMo')
    expect(checkoutCtaLabel('manual', 100)).toBe('Record manual transfer')
  })
})
