/// <reference path="../_shared/deno.d.ts" />
import { requireAuthenticatedStaff } from '../_shared/auth.ts'
import { RateLimitError, assertRateLimit } from '../_shared/rateLimit.ts'
import { sellerAssignedEmail } from '../_shared/emailTemplates.ts'
import { claimNotificationEvent } from '../_shared/idempotency.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { sendEmail } from '../_shared/resend.ts'
import { createServiceClient, getAppUrl } from '../_shared/supabaseAdmin.ts'

interface NotifyPayload {
  landId: string
  sellerId: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    await requireAuthenticatedStaff(req)
    const body = (await req.json()) as NotifyPayload

    if (!body.landId || !body.sellerId) {
      return errorResponse('Invalid payload: landId and sellerId are required', 400)
    }

    const supabase = createServiceClient()

    try {
      await assertRateLimit(supabase, `notify-seller-assigned:${body.landId}`, 10, 3_600)
    } catch (error) {
      if (error instanceof RateLimitError) {
        return errorResponse(error.message, 429)
      }
      throw error
    }

    const eventKey = `seller-assigned:${body.landId}:${body.sellerId}`

    const shouldSend = await claimNotificationEvent(
      supabase,
      eventKey,
      'notify-seller-assigned',
    )

    if (!shouldSend) {
      return jsonResponse({ success: true, skipped: true })
    }

    const { data: land, error: landError } = await supabase
      .from('land_records')
      .select('title, location, seller_id')
      .eq('id', body.landId)
      .single()

    if (landError || !land) {
      return errorResponse(`Land record not found: ${landError?.message ?? 'unknown error'}`, 404)
    }

    if (land.seller_id !== body.sellerId) {
      return errorResponse('Seller is not assigned to this land record', 403)
    }

    const { data: seller, error: sellerError } = await supabase
      .from('users')
      .select('email, full_name, role')
      .eq('id', body.sellerId)
      .single()

    if (sellerError || !seller?.email || seller.role !== 'seller') {
      return errorResponse(`Seller profile not found: ${sellerError?.message ?? 'invalid seller'}`, 404)
    }

    const portalUrl = `${getAppUrl()}/seller/dashboard`
    const sellerName = seller.full_name ?? seller.email

    const html = sellerAssignedEmail({
      sellerName,
      landTitle: land.title,
      location: land.location ?? 'Uganda',
      portalUrl,
    })

    await sendEmail({
      to: seller.email,
      subject: `Welcome to SashaCrush — ${land.title}`,
      html,
    })

    return jsonResponse({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status =
      message === 'Unauthorized' || message === 'Forbidden' ? 403 : 500
    return errorResponse(message, status)
  }
})
