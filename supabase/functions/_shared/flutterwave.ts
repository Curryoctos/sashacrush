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

export interface FlutterwaveTransferResult {
  transferId: number
  reference: string
  status: string
}

/** Deterministic transfer reference so retries never create a second payout. */
export function buildFlutterwavePayoutReference(paymentId: string): string {
  const compact = paymentId.replace(/-/g, '').toLowerCase()
  return `sc-payout-${compact}`
}

export function isSuccessfulTransferStatus(status: string | undefined): boolean {
  const normalized = status?.toUpperCase()
  return normalized === 'SUCCESSFUL' || normalized === 'SUCCESS'
}

export function isFailedTransferStatus(status: string | undefined): boolean {
  const normalized = status?.toUpperCase()
  return (
    normalized === 'FAILED' ||
    normalized === 'FAILURE' ||
    normalized === 'CANCELLED' ||
    normalized === 'CANCELED'
  )
}

export function isInFlightTransferStatus(status: string | undefined): boolean {
  if (!status || isSuccessfulTransferStatus(status) || isFailedTransferStatus(status)) {
    return false
  }
  return true
}

/**
 * Look up an existing transfer by our client reference (idempotent retries).
 */
export async function getFlutterwaveTransferByReference(
  reference: string,
): Promise<FlutterwaveTransferResult | null> {
  const secret = requireFlutterwaveSecretKey()
  const url = new URL('https://api.flutterwave.com/v3/transfers')
  url.searchParams.set('reference', reference)

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  })

  const json = (await response.json()) as {
    status?: string
    message?: string
    data?:
      | { id?: number; reference?: string; status?: string }
      | Array<{ id?: number; reference?: string; status?: string }>
  }

  if (!response.ok || json.status !== 'success') {
    return null
  }

  const row = Array.isArray(json.data) ? json.data[0] : json.data
  if (!row?.id) {
    return null
  }

  return {
    transferId: Number(row.id),
    reference: String(row.reference ?? reference),
    status: String(row.status ?? 'NEW').toUpperCase(),
  }
}

/**
 * Disburse UGX to a Uganda mobile-money wallet (company → seller).
 * Uses Flutterwave Transfers v3 — not hosted checkout / charges.
 * @see https://developer.flutterwave.com/docs/transfer
 */
export async function createFlutterwaveMobileMoneyTransfer(params: {
  amountUgx: number
  paymentId: string
  landTitle: string
  recipientPhone: string
  recipientName?: string | null
  mobileMoneyNetwork?: 'mtn' | 'airtel' | null
  /** Must be deterministic per payment for safe retries. */
  reference?: string
}): Promise<FlutterwaveTransferResult> {
  const secret = requireFlutterwaveSecretKey()
  const amount = Math.round(Number(params.amountUgx))
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Flutterwave payout amount must be a positive UGX integer')
  }

  const accountNumber = params.recipientPhone.replace(/^\+/, '').replace(/\s+/g, '')
  if (!/^2567\d{8}$/.test(accountNumber)) {
    throw new Error('Recipient phone must be a Uganda mobile number (+2567…)')
  }

  const reference = params.reference ?? buildFlutterwavePayoutReference(params.paymentId)
  const networkLabel =
    params.mobileMoneyNetwork === 'airtel'
      ? 'Airtel Money'
      : params.mobileMoneyNetwork === 'mtn'
        ? 'MTN MoMo'
        : 'Mobile money'

  const response = await fetch('https://api.flutterwave.com/v3/transfers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Uganda MoMo rail code on Flutterwave Transfers
      account_bank: 'MPS',
      account_number: accountNumber,
      amount,
      narration: `SashaCrush payout · ${params.landTitle} · ${networkLabel}`.slice(0, 100),
      currency: 'UGX',
      reference,
      beneficiary_name: (params.recipientName ?? 'SashaCrush seller').slice(0, 100),
      debit_currency: 'UGX',
      meta: [
        {
          payment_id: params.paymentId,
          mobile_money_network: params.mobileMoneyNetwork ?? null,
          recipient_phone: params.recipientPhone,
        },
      ],
    }),
  })

  const json = (await response.json()) as {
    status?: string
    message?: string
    data?: { id?: number; reference?: string; status?: string }
  }

  const duplicate =
    /already exists|duplicate/i.test(json.message ?? '') ||
    /already exists|duplicate/i.test(String(json.status ?? ''))

  if (duplicate) {
    const existing = await getFlutterwaveTransferByReference(reference)
    if (existing) {
      return existing
    }
    throw new Error(json.message ?? 'Flutterwave transfer reference already exists')
  }

  if (!response.ok || json.status !== 'success' || json.data?.id == null) {
    throw new Error(json.message ?? 'Flutterwave transfer creation failed')
  }

  return {
    transferId: Number(json.data.id),
    reference: String(json.data.reference ?? reference),
    status: String(json.data.status ?? 'NEW').toUpperCase(),
  }
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

export interface FlutterwaveVerifiedTransfer {
  id: number
  reference: string
  status: string
  amount: number
  currency: string
  metaPaymentId: string | null
}

function extractMetaPaymentId(meta: unknown): string | null {
  if (Array.isArray(meta)) {
    for (const entry of meta) {
      if (entry && typeof entry === 'object' && 'payment_id' in entry) {
        const value = (entry as { payment_id?: unknown }).payment_id
        if (typeof value === 'string' && value.trim()) {
          return value.trim()
        }
      }
    }
    return null
  }

  if (typeof meta === 'string') {
    try {
      return extractMetaPaymentId(JSON.parse(meta))
    } catch {
      return null
    }
  }

  if (meta && typeof meta === 'object' && 'payment_id' in meta) {
    const value = (meta as { payment_id?: unknown }).payment_id
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  return null
}

/**
 * Verify a Flutterwave transfer (payout) with their API.
 */
export async function verifyFlutterwaveTransfer(
  transferId: number | string,
): Promise<FlutterwaveVerifiedTransfer> {
  const secret = requireFlutterwaveSecretKey()

  const response = await fetch(`https://api.flutterwave.com/v3/transfers/${transferId}`, {
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  })

  const json = (await response.json()) as {
    status?: string
    message?: string
    data?: {
      id?: number
      reference?: string
      status?: string
      amount?: number
      currency?: string
      meta?: unknown
    }
  }

  if (!response.ok || json.status !== 'success' || !json.data) {
    throw new Error(json.message ?? 'Flutterwave transfer verify failed')
  }

  return {
    id: Number(json.data.id),
    reference: String(json.data.reference ?? ''),
    status: String(json.data.status ?? '').toUpperCase(),
    amount: Number(json.data.amount),
    currency: String(json.data.currency ?? '').toUpperCase(),
    metaPaymentId: extractMetaPaymentId(json.data.meta),
  }
}

/** @deprecated Charge verify — kept for legacy inbound webhooks only. */
export async function verifyFlutterwaveTransaction(
  transactionId: number | string,
): Promise<{
  id: number
  txRef: string
  status: string
  amount: number
  currency: string
  metaPaymentId: string | null
}> {
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

  return {
    id: Number(json.data.id),
    txRef: String(json.data.tx_ref ?? ''),
    status: String(json.data.status ?? '').toLowerCase(),
    amount: Number(json.data.amount),
    currency: String(json.data.currency ?? '').toUpperCase(),
    metaPaymentId: extractMetaPaymentId(json.data.meta),
  }
}
