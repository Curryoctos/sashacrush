import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { requireServiceRole } from '../_shared/auth.ts'
import { claimNotificationEvent } from '../_shared/idempotency.ts'
import { newReceiptEmail } from '../_shared/emailTemplates.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { RateLimitError, assertRateLimit } from '../_shared/rateLimit.ts'
import { sendEmail } from '../_shared/resend.ts'
import { createServiceClient, getAppUrl } from '../_shared/supabaseAdmin.ts'

interface ReceiptRow {
  id: string
  payment_id: string
  seller_id: string
  receipt_number: string
  pdf_path?: string | null
  created_at?: string
}

interface WebhookPayload {
  type?: string
  table?: string
  record?: ReceiptRow
  schema?: string
}

function extractReceipt(payload: WebhookPayload | ReceiptRow): ReceiptRow | null {
  if ('receipt_number' in payload && 'payment_id' in payload && 'seller_id' in payload) {
    return payload as ReceiptRow
  }

  if ('record' in payload && payload.record) {
    return payload.record
  }

  return null
}

function validateReceipt(receipt: ReceiptRow | null): receipt is ReceiptRow {
  return Boolean(
    receipt?.id &&
      receipt.payment_id &&
      receipt.seller_id &&
      receipt.receipt_number,
  )
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    requireServiceRole(req)

    const payload = (await req.json()) as WebhookPayload | ReceiptRow
    const receipt = extractReceipt(payload)

    if (!validateReceipt(receipt)) {
      return errorResponse('Invalid webhook payload: missing required receipt fields', 400)
    }

    const supabase = createServiceClient()

    try {
      await assertRateLimit(supabase, `notify-receipt-created:${receipt.id}`, 5, 3_600)
    } catch (error) {
      if (error instanceof RateLimitError) {
        return errorResponse(error.message, 429)
      }
      throw error
    }

    const shouldSend = await claimNotificationEvent(
      supabase,
      `receipt:${receipt.id}`,
      'notify-receipt-created',
    )

    if (!shouldSend) {
      return jsonResponse({ success: true, skipped: true })
    }

    const { data: seller, error: sellerError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', receipt.seller_id)
      .single()

    if (sellerError || !seller?.email) {
      return errorResponse(`Seller profile not found: ${sellerError?.message ?? 'missing email'}`)
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('land_id, amount_usd, amount_ugx')
      .eq('id', receipt.payment_id)
      .single()

    if (paymentError || !payment) {
      return errorResponse(`Payment not found: ${paymentError?.message ?? 'unknown error'}`)
    }

    const { data: land, error: landError } = await supabase
      .from('land_records')
      .select('title')
      .eq('id', payment.land_id)
      .single()

    if (landError || !land) {
      return errorResponse(`Land record not found: ${landError?.message ?? 'unknown error'}`)
    }

    const portalUrl = `${getAppUrl()}/seller/receipts`
    const sellerName = seller.full_name ?? seller.email

    const html = newReceiptEmail({
      sellerName,
      receiptNumber: receipt.receipt_number,
      amountUsd: Number(payment.amount_usd),
      amountUgx: Number(payment.amount_ugx ?? 0),
      landTitle: land.title,
      portalUrl,
    })

    await sendEmail({
      to: seller.email,
      subject: `Receipt ${receipt.receipt_number} — ${land.title}`,
      html,
    })

    return jsonResponse({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message === 'Unauthorized' ? 401 : 500
    return errorResponse(message, status)
  }
})
