import { getEnv, requireEnv } from './env.ts'

export function getStripeSecretKey(): string | undefined {
  return getEnv('STRIPE_SECRET_KEY')
}

export function requireStripeSecretKey(): string {
  return requireEnv('STRIPE_SECRET_KEY')
}

export function getStripeWebhookSecret(): string | undefined {
  return getEnv('STRIPE_WEBHOOK_SECRET')
}

function formBody(params: Record<string, string>): string {
  return new URLSearchParams(params).toString()
}

export interface StripeCheckoutSession {
  id: string
  url: string | null
  payment_intent: string | null
}

export async function createStripeCheckoutSession(params: {
  amountUsd: number
  paymentId: string
  landTitle: string
  successUrl: string
  cancelUrl: string
  customerEmail?: string | null
}): Promise<StripeCheckoutSession> {
  const secret = requireStripeSecretKey()
  const amountCents = Math.round(params.amountUsd * 100)

  if (!Number.isFinite(amountCents) || amountCents < 50) {
    throw new Error('Stripe amount must be at least $0.50')
  }

  const body: Record<string, string> = {
    mode: 'payment',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][product_data][name]': `SashaCrush — ${params.landTitle}`,
    'line_items[0][price_data][unit_amount]': String(amountCents),
    'line_items[0][quantity]': '1',
    'metadata[payment_id]': params.paymentId,
    'payment_intent_data[metadata][payment_id]': params.paymentId,
  }

  if (params.customerEmail) {
    body.customer_email = params.customerEmail
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody(body),
  })

  const json = (await response.json()) as StripeCheckoutSession & { error?: { message?: string } }

  if (!response.ok) {
    throw new Error(json.error?.message ?? 'Stripe Checkout session creation failed')
  }

  return {
    id: json.id,
    url: json.url,
    payment_intent: typeof json.payment_intent === 'string' ? json.payment_intent : null,
  }
}

export async function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!signatureHeader) {
    return false
  }

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, ...rest] = part.split('=')
      return [key, rest.join('=')]
    }),
  )

  const timestamp = parts.t
  const expected = parts.v1

  if (!timestamp || !expected) {
    return false
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    return false
  }

  const signedPayload = `${timestamp}.${payload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedPayload),
  )
  const digest = [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return timingSafeEqual(digest, expected)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}
