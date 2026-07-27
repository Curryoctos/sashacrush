import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { createReceipt } from './createReceipt.ts'
import {
  writePaymentConfirmAudit,
  type ConfirmAuditContext,
} from './paymentAudit.ts'

export interface ConfirmPaymentResult {
  receiptNumber: string
  alreadyConfirmed: boolean
}

/**
 * Confirm a payment and issue a receipt PDF (BR-02).
 * Safe to call from staff invoke or payment-gateway webhooks.
 *
 * Receipt creation is delegated entirely to createReceipt —
 * the single source of truth for number allocation, PDF, storage, and DB.
 */
export async function confirmPaymentAndIssueReceipt(
  supabase: SupabaseClient,
  paymentId: string,
  audit?: ConfirmAuditContext,
): Promise<ConfirmPaymentResult> {
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, land_id, amount_usd, amount_ugx, rate_used, status')
    .eq('id', paymentId)
    .single()

  if (paymentError || !payment) {
    throw new ConfirmPaymentError('Payment not found', 404)
  }

  const { data: existingReceipt } = await supabase
    .from('receipts')
    .select('receipt_number')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (payment.status === 'confirmed' && existingReceipt?.receipt_number) {
    return {
      receiptNumber: existingReceipt.receipt_number,
      alreadyConfirmed: true,
    }
  }

  const { data: land, error: landError } = await supabase
    .from('land_records')
    .select('seller_id')
    .eq('id', payment.land_id)
    .single()

  if (landError || !land?.seller_id) {
    throw new ConfirmPaymentError('This land record has no seller assigned.', 400)
  }

  const amountUsd = Number(payment.amount_usd)
  const amountUgx =
    payment.amount_ugx != null
      ? Number(payment.amount_ugx)
      : payment.rate_used != null
        ? amountUsd * Number(payment.rate_used)
        : 0
  const rateUsed =
    payment.rate_used != null
      ? Number(payment.rate_used)
      : amountUsd > 0 && amountUgx > 0
        ? amountUgx / amountUsd
        : 0

  const now = new Date().toISOString()

  try {
    const { receiptNumber } = await createReceipt({
      supabase,
      paymentId: payment.id,
      landId: payment.land_id,
      sellerId: land.seller_id,
      amountUsd,
      amountUgx,
      rateUsed,
      transactionId: payment.id,
      confirmedAt: now,
    })

    if (audit) {
      await writePaymentConfirmAudit(supabase, payment.id, {
        ...audit,
        receiptNumber,
      })
    }

    return {
      receiptNumber,
      alreadyConfirmed: Boolean(existingReceipt?.receipt_number),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new ConfirmPaymentError(message)
  }
}

export class ConfirmPaymentError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ConfirmPaymentError'
    this.status = status
  }
}
