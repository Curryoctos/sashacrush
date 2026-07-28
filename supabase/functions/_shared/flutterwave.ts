import { getEnv, requireEnv } from './env.ts'

export function getFlutterwaveSecretKey(): string | undefined {
  return getEnv('FLUTTERWAVE_SECRET_KEY')
}

export function requireFlutterwaveSecretKey(): string {
  return requireEnv('FLUTTERWAVE_SECRET_KEY')
}

export function getFlutterwaveWebhookHash(): string | undefined {
  return getEnv('FLUTTERWAVE_WEBHOOK_HASH')
}

export interface FlutterwavePaymentLink {
  txRef: string
  link: string
}

export async function createFlutterwavePaymentLink(params: {
  amountUsd: number
  amountUgx: number | null
  paymentId: string
  landTitle: string
  redirectUrl: string
  customerEmail: string
  customerName?: string | null
  mobileMoneyNetwork?: 'mtn' | 'airtel' | null
}): Promise<FlutterwavePaymentLink> {
  const secret = requireFlutterwaveSecretKey()
  const txRef = `sc-${params.paymentId.replace(/-/g, '').slice(0, 20)}-${Date.now()}`

  const useUgx = params.amountUgx != null && Number(params.amountUgx) > 0
  const amount = useUgx ? Number(params.amountUgx) : Number(params.amountUsd)
  const currency = useUgx ? 'UGX' : 'USD'

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Flutterwave amount must be positive')
  }

  const response = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: txRef,
      amount,
      currency,
      payment_options: 'mobilemoneyuganda',
      redirect_url: params.redirectUrl,
      customer: {
        email: params.customerEmail,
        name: params.customerName ?? 'SashaCrush payer',
      },
      customizations: {
        title: 'SashaCrush',
        description: `Payment for ${params.landTitle}`,
      },
      meta: {
        payment_id: params.paymentId,
        mobile_money_network: params.mobileMoneyNetwork ?? null,
      },
    }),
  })

  const json = (await response.json()) as {
    status?: string
    message?: string
    data?: { link?: string }
  }

  if (!response.ok || json.status !== 'success' || !json.data?.link) {
    throw new Error(json.message ?? 'Flutterwave payment link creation failed')
  }

  return { txRef, link: json.data.link }
}

export function verifyFlutterwaveWebhookHash(
  headerHash: string | null,
  expectedHash: string | undefined,
): boolean {
  if (!headerHash || !expectedHash) {
    return false
  }

  if (headerHash.length !== expectedHash.length) {
    return false
  }

  let mismatch = 0
  for (let i = 0; i < headerHash.length; i++) {
    mismatch |= headerHash.charCodeAt(i) ^ expectedHash.charCodeAt(i)
  }
  return mismatch === 0
}

export interface FlutterwaveVerifiedTransaction {
  id: number
  txRef: string
  status: string
  amount: number
  currency: string
  metaPaymentId: string | null
}

/**
 * Verify a Flutterwave transaction with their API (authoritative amount/status).
 */
export async function verifyFlutterwaveTransaction(
  transactionId: number | string,
): Promise<FlutterwaveVerifiedTransaction> {
  const secret = requireFlutterwaveSecretKey()

  const response = await fetch(
    `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
    {
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    },
  )

  const json = (await response.json()) as {
    status?: string
    message?: string
    data?: {
      id?: number
      tx_ref?: string
      status?: string
      amount?: number
      currency?: string
      meta?: { payment_id?: string } | string
    }
  }

  if (!response.ok || json.status !== 'success' || !json.data) {
    throw new Error(json.message ?? 'Flutterwave transaction verify failed')
  }

  let metaPaymentId: string | null = null
  const meta = json.data.meta
  if (typeof meta === 'string') {
    try {
      const parsed = JSON.parse(meta) as { payment_id?: string }
      metaPaymentId = parsed.payment_id?.trim() ?? null
    } catch {
      metaPaymentId = null
    }
  } else if (meta && typeof meta === 'object') {
    metaPaymentId = meta.payment_id?.trim() ?? null
  }

  return {
    id: Number(json.data.id),
    txRef: String(json.data.tx_ref ?? ''),
    status: String(json.data.status ?? '').toLowerCase(),
    amount: Number(json.data.amount),
    currency: String(json.data.currency ?? '').toUpperCase(),
    metaPaymentId,
  }
}
