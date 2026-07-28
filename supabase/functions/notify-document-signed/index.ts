/// <reference path="../_shared/deno.d.ts" />
import { requireAuthenticatedUser } from '../_shared/auth.ts'
import { documentSignedEmail } from '../_shared/emailTemplates.ts'
import { claimNotificationEvent } from '../_shared/idempotency.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { RateLimitError, assertRateLimit } from '../_shared/rateLimit.ts'
import { sendEmail } from '../_shared/resend.ts'
import { createServiceClient, getAppUrl } from '../_shared/supabaseAdmin.ts'

interface NotifyPayload {
  documentId: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const caller = await requireAuthenticatedUser(req)
    const body = (await req.json()) as NotifyPayload

    if (!body.documentId) {
      return errorResponse('Invalid payload: documentId is required', 400)
    }

    const supabase = createServiceClient()

    try {
      await assertRateLimit(
        supabase,
        `notify-document-signed:${caller.userId}:${body.documentId}`,
        20,
        3_600,
      )
    } catch (error) {
      if (error instanceof RateLimitError) {
        return errorResponse(error.message, 429)
      }
      throw error
    }

    const eventKey = `document-signed:${body.documentId}`
    const shouldSend = await claimNotificationEvent(
      supabase,
      eventKey,
      'notify-document-signed',
    )

    if (!shouldSend) {
      return jsonResponse({ success: true, skipped: true })
    }

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, title, file_path, land_id, status, signed_by')
      .eq('id', body.documentId)
      .single()

    if (documentError || !document) {
      return errorResponse(`Document not found: ${documentError?.message ?? 'unknown error'}`, 404)
    }

    if (document.status !== 'signed' || !document.signed_by) {
      return errorResponse('Document is not signed', 400)
    }

    const isStaff = caller.role === 'admin' || caller.role === 'agent'
    if (!isStaff && document.signed_by !== caller.userId) {
      return errorResponse('Forbidden', 403)
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

    const { data: signer, error: signerError } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', document.signed_by)
      .single()

    if (signerError || !signer) {
      return errorResponse(`Signer profile not found: ${signerError?.message ?? 'unknown error'}`)
    }

    const { data: land, error: landError } = await supabase
      .from('land_records')
      .select('title')
      .eq('id', document.land_id)
      .single()

    if (landError || !land) {
      return errorResponse(`Land record not found: ${landError?.message ?? 'unknown error'}`)
    }

    const documentName = document.title ?? document.file_path ?? 'Document'
    const portalUrl = `${getAppUrl()}/admin/documents?land=${document.land_id}`
    const adminName = admin.full_name ?? admin.email
    const signedByName = signer.full_name ?? signer.email

    const html = documentSignedEmail({
      adminName,
      documentName,
      signedByName,
      landTitle: land.title,
      portalUrl,
    })

    await sendEmail({
      to: admin.email,
      subject: `Document signed — ${land.title}`,
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
