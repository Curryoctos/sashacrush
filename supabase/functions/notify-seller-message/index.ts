import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { requireAuthenticatedUser } from '../_shared/auth.ts'
import { sellerMessageEmail } from '../_shared/emailTemplates.ts'
import { claimNotificationEvent } from '../_shared/idempotency.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { RateLimitError, assertRateLimit } from '../_shared/rateLimit.ts'
import { sendEmail } from '../_shared/resend.ts'
import { createServiceClient, getAppUrl } from '../_shared/supabaseAdmin.ts'

interface NotifyPayload {
  messageId: string
  landId: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const caller = await requireAuthenticatedUser(req)

    if (caller.role !== 'seller') {
      return errorResponse('Forbidden', 403)
    }

    const body = (await req.json()) as NotifyPayload

    if (!body.messageId || !body.landId) {
      return errorResponse('Invalid payload: messageId and landId are required', 400)
    }

    const supabase = createServiceClient()

    try {
      await assertRateLimit(
        supabase,
        `notify-seller-message:${caller.userId}:${body.landId}`,
        30,
        3_600,
      )
    } catch (error) {
      if (error instanceof RateLimitError) {
        return errorResponse(error.message, 429)
      }
      throw error
    }

    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select('id, body, sender_id, channel, land_id')
      .eq('id', body.messageId)
      .single()

    if (messageError || !message) {
      return errorResponse(`Message not found: ${messageError?.message ?? 'unknown error'}`, 404)
    }

    if (
      message.sender_id !== caller.userId ||
      message.channel !== 'seller_channel' ||
      message.land_id !== body.landId
    ) {
      return errorResponse('Forbidden', 403)
    }

    const shouldSend = await claimNotificationEvent(
      supabase,
      `chat-message:${body.messageId}`,
      'notify-seller-message',
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

    const { data: seller } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', caller.userId)
      .single()

    const { data: land, error: landError } = await supabase
      .from('land_records')
      .select('title')
      .eq('id', body.landId)
      .single()

    if (landError || !land) {
      return errorResponse(`Land record not found: ${landError?.message ?? 'unknown error'}`, 404)
    }

    const portalUrl = `${getAppUrl()}/admin/chat`
    const adminName = admin.full_name ?? admin.email
    const sellerName = seller?.full_name ?? seller?.email ?? 'Land owner'

    const html = sellerMessageEmail({
      adminName,
      sellerName,
      landTitle: land.title,
      messagePreview: message.body,
      portalUrl,
    })

    await sendEmail({
      to: admin.email,
      subject: `New seller message — ${land.title}`,
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
