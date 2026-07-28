/// <reference path="../_shared/deno.d.ts" />
import { requireServiceRole } from '../_shared/auth.ts'
import { claimNotificationEvent } from '../_shared/idempotency.ts'
import { paymentConfirmedEmail } from '../_shared/emailTemplates.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { RateLimitError, assertRateLimit } from '../_shared/rateLimit.ts'
import { sendEmail } from '../_shared/resend.ts'
import { createServiceClient, getAppUrl } from '../_shared/supabaseAdmin.ts'

interface PaymentRow {
  id: string
  land_id: string
  amount_usd: number
  amount_ugx: number | null
  method: string | null
  status: string
}

interface WebhookPayload {
  type?: string
  table?: string
  record?: PaymentRow
  old_record?: PaymentRow | null
  schema?: string
}

function extractPayment(payload: WebhookPayload | PaymentRow): {
  payment: PaymentRow | null
  oldPayment: PaymentRow | null
} {
  if ('land_id' in payload && 'amount_usd' in payload && 'status' in payload) {
    return { payment: payload as PaymentRow, oldPayment: null }
  }

  if ('record' in payload) {
    return {
      payment: payload.record ?? null,
      oldPayment: payload.old_record ?? null,
    }
  }

  return { payment: null, oldPayment: null }
}

function isConfirmedTransition(payment: PaymentRow, oldPayment: PaymentRow | null): boolean {
  if (payment.status !== 'confirmed') {
    return false
  }

  if (!oldPayment) {
    return true
  }

  return oldPayment.status !== 'confirmed'
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    requireServiceRole(req)

    const payload = (await req.json()) as WebhookPayload | PaymentRow
    const { payment, oldPayment } = extractPayment(payload)

    if (!payment?.id || !payment.land_id) {
      return errorResponse('Invalid webhook payload: missing required payment fields', 400)
    }

    if (!isConfirmedTransition(payment, oldPayment)) {
      return jsonResponse({ success: true, skipped: true, reason: 'Payment status is not confirmed' })
    }

    const supabase = createServiceClient()

    try {
      await assertRateLimit(supabase, `notify-payment-confirmed:${payment.id}`, 5, 3_600)
    } catch (error) {
      if (error instanceof RateLimitError) {
        return errorResponse(error.message, 429)
      }
      throw error
    }

    const shouldSend = await claimNotificationEvent(
      supabase,
      `payment:${payment.id}:confirmed`,
      'notify-payment-confirmed',
    )

    if (!shouldSend) {
      return jsonResponse({ success: true, skipped: true })
    }

    const { data: admin, error: adminError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('role', 'admin')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (adminError || !admin?.email) {
      return errorResponse(`Admin profile not found: ${adminError?.message ?? 'missing email'}`)
    }

    const { data: land, error: landError } = await supabase
      .from('land_records')
      .select('title')
      .eq('id', payment.land_id)
      .single()

    if (landError || !land) {
      return errorResponse(`Land record not found: ${landError?.message ?? 'unknown error'}`)
    }

    const { data: receipt } = await supabase
      .from('receipts')
      .select('receipt_number')
      .eq('payment_id', payment.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const portalUrl = `${getAppUrl()}/admin/payments`
    const adminName = admin.full_name ?? admin.email

    const html = paymentConfirmedEmail({
      adminName,
      amountUsd: Number(payment.amount_usd),
      amountUgx: Number(payment.amount_ugx ?? 0),
      method: payment.method ?? 'unknown',
      landTitle: land.title,
      receiptNumber: receipt?.receipt_number ?? 'Pending',
      portalUrl,
    })

    await sendEmail({
      to: admin.email,
      subject: `Payment confirmed — ${land.title}`,
      html,
    })

    return jsonResponse({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message === 'Unauthorized' ? 401 : 500
    return errorResponse(message, status)
  }
})
