import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { requireAuthenticatedStaff } from '../_shared/auth.ts'
import { documentSentEmail } from '../_shared/emailTemplates.ts'
import { claimNotificationEvent } from '../_shared/idempotency.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { RateLimitError, assertRateLimit } from '../_shared/rateLimit.ts'
import { sendEmail } from '../_shared/resend.ts'
import { createServiceClient, getAppUrl } from '../_shared/supabaseAdmin.ts'

interface NotifyPayload {
  documentId: string
  sellerId: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const caller = await requireAuthenticatedStaff(req)

    const body = (await req.json()) as NotifyPayload

    if (!body.documentId || !body.sellerId) {
      return errorResponse('Invalid payload: documentId and sellerId are required', 400)
    }

    const supabase = createServiceClient()

    try {
      await assertRateLimit(
        supabase,
        `notify-document-sent:${caller.userId}:${body.documentId}`,
        20,
        3_600,
      )
    } catch (error) {
      if (error instanceof RateLimitError) {
        return errorResponse(error.message, 429)
      }
      throw error
    }

    const eventKey = `document-sent:${body.documentId}:${body.sellerId}`
    const shouldSend = await claimNotificationEvent(
      supabase,
      eventKey,
      'notify-document-sent',
    )

    if (!shouldSend) {
      return jsonResponse({ success: true, skipped: true })
    }

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, title, file_path, land_id, status, assigned_to')
      .eq('id', body.documentId)
      .single()

    if (documentError || !document) {
      return errorResponse(`Document not found: ${documentError?.message ?? 'unknown error'}`, 404)
    }

    if (document.status !== 'sent') {
      return errorResponse('Document must be in sent status before notification', 400)
    }

    if (document.assigned_to !== body.sellerId) {
      return errorResponse('Seller is not assigned to this document', 403)
    }

    const { data: land, error: landError } = await supabase
      .from('land_records')
      .select('title, seller_id')
      .eq('id', document.land_id)
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

    const documentName = document.title ?? document.file_path ?? 'Document'
    const signingUrl = `${getAppUrl()}/seller/documents?sign=${body.documentId}`
    const recipientName = seller.full_name ?? seller.email

    const html = documentSentEmail({
      recipientName,
      documentName,
      landTitle: land.title,
      signingUrl,
    })

    await sendEmail({
      to: seller.email,
      subject: `Document ready to sign — ${land.title}`,
      html,
    })

    return jsonResponse({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message === 'Unauthorized' || message === 'Forbidden' ? 403 : 500
    return errorResponse(message, status)
  }
})
