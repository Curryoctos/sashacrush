/// <reference path="../_shared/deno.d.ts" />
import { requireServiceRole } from '../_shared/auth.ts'
import { claimNotificationEvent } from '../_shared/idempotency.ts'
import { paymentConfirmedEmail } from '../_shared/emailTemplates.ts'
import { handleCorsPreflight, errorResponse, jsonResponse } from '../_shared/http.ts'
import { RateLimitError, assertRateLimit } from '../_shared/rateLimit.ts'
import { sendEmail } from '../_shared/resend.ts'
import { createServiceClient, getAppUrl } from '../_shared/supabaseAdmin.ts'

interface PaymentRow {
  id: string
  land_id: string | null
  project_id?: string | null
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
  if ('amount_usd' in payload && 'status' in payload && ('land_id' in payload || 'project_id' in payload)) {
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
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    requireServiceRole(req)

    const payload = (await req.json()) as WebhookPayload | PaymentRow
    const { payment, oldPayment } = extractPayment(payload)

    if (!payment?.id || (!payment.land_id && !payment.project_id)) {
      return errorResponse(
        'Invalid webhook payload: payment needs id and land_id or project_id',
        400,
      )
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

    let title = 'Payout'
    let portalUrl = `${getAppUrl()}/admin/payments`

    if (payment.land_id) {
      const { data: land, error: landError } = await supabase
        .from('land_records')
        .select('title')
        .eq('id', payment.land_id)
        .maybeSingle()

      if (landError) {
        return errorResponse(`Land record lookup failed: ${landError.message}`)
      }
      if (land?.title) {
        title = land.title
        portalUrl = `${getAppUrl()}/admin/payments?land=${payment.land_id}`
      }
    } else if (payment.project_id) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('title')
        .eq('id', payment.project_id)
        .maybeSingle()

      if (projectError) {
        return errorResponse(`Project lookup failed: ${projectError.message}`)
      }
      if (project?.title) {
        title = project.title
        portalUrl = `${getAppUrl()}/admin/payments?project=${payment.project_id}`
      }
    }

    const { data: receipt } = await supabase
      .from('receipts')
      .select('receipt_number')
      .eq('payment_id', payment.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const adminName = admin.full_name ?? admin.email

    const html = paymentConfirmedEmail({
      adminName,
      amountUsd: Number(payment.amount_usd),
      amountUgx: Number(payment.amount_ugx ?? 0),
      method: payment.method ?? 'unknown',
      landTitle: title,
      receiptNumber: receipt?.receipt_number ?? 'Pending',
      portalUrl,
    })

    await sendEmail({
      to: admin.email,
      subject: `Payment confirmed — ${title}`,
      html,
    })

    return jsonResponse({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message === 'Unauthorized' ? 401 : 500
    return errorResponse(message, status)
  }
})
