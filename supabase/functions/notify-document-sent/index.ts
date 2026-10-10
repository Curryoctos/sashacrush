/// <reference path="../_shared/deno.d.ts" />
import { requireAuthenticatedStaff } from '../_shared/auth.ts'
import { documentSentEmail } from '../_shared/emailTemplates.ts'
import { claimNotificationEvent } from '../_shared/idempotency.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { RateLimitError, assertRateLimit } from '../_shared/rateLimit.ts'
import { sendEmail } from '../_shared/resend.ts'
import { createServiceClient, getAppUrl } from '../_shared/supabaseAdmin.ts'

interface NotifyPayload {
  documentId: string
  /** Preferred: seller or executive assignee */
  assigneeId?: string
  /** Legacy alias for assigneeId */
  sellerId?: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const caller = await requireAuthenticatedStaff(req)

    const body = (await req.json()) as NotifyPayload
    const assigneeId = body.assigneeId ?? body.sellerId

    if (!body.documentId || !assigneeId) {
      return errorResponse('Invalid payload: documentId and assigneeId are required', 400)
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

    const eventKey = `document-sent:${body.documentId}:${assigneeId}`
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
      .select('id, title, file_path, land_id, investor_id, status, assigned_to')
      .eq('id', body.documentId)
      .single()

    if (documentError || !document) {
      return errorResponse(`Document not found: ${documentError?.message ?? 'unknown error'}`, 404)
    }

    if (document.status !== 'sent') {
      return errorResponse('Document must be in sent status before notification', 400)
    }

    if (document.assigned_to !== assigneeId) {
      return errorResponse('Assignee is not assigned to this document', 403)
    }

    const { data: assignee, error: assigneeError } = await supabase
      .from('users')
      .select('email, full_name, role')
      .eq('id', assigneeId)
      .single()

    if (
      assigneeError ||
      !assignee?.email ||
      (assignee.role !== 'seller' && assignee.role !== 'agent')
    ) {
      return errorResponse(
        `Signer profile not found: ${assigneeError?.message ?? 'invalid assignee'}`,
        404,
      )
    }

    let contextTitle = 'Investment agreement'
    let signingPath = `/agent/agreements?sign=${body.documentId}`

    if (document.land_id) {
      const { data: land, error: landError } = await supabase
        .from('land_records')
        .select('title, seller_id')
        .eq('id', document.land_id)
        .single()

      if (landError || !land) {
        return errorResponse(`Land record not found: ${landError?.message ?? 'unknown error'}`, 404)
      }

      if (land.seller_id !== assigneeId) {
        return errorResponse('Seller is not assigned to this land record', 403)
      }

      if (assignee.role !== 'seller') {
        return errorResponse('Deal documents must be signed by the land seller', 403)
      }

      contextTitle = land.title
      signingPath = `/seller/documents?sign=${body.documentId}`
    } else {
      if (document.investor_id !== assigneeId || assignee.role !== 'agent') {
        return errorResponse('Agent is not assigned to this investment agreement', 403)
      }
    }

    const documentName = document.title ?? document.file_path ?? 'Document'
    const signingUrl = `${getAppUrl()}${signingPath}`
    const recipientName = assignee.full_name ?? assignee.email

    const html = documentSentEmail({
      recipientName,
      documentName,
      landTitle: contextTitle,
      signingUrl,
    })

    await sendEmail({
      to: assignee.email,
      subject: `Document ready to sign — ${contextTitle}`,
      html,
    })

    return jsonResponse({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message === 'Unauthorized' || message === 'Forbidden' ? 403 : 500
    return errorResponse(message, status)
  }
})
