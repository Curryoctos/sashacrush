import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { documentSentEmail } from '../_shared/emailTemplates.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
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
    const body = (await req.json()) as NotifyPayload

    if (!body.documentId || !body.sellerId) {
      return errorResponse('Invalid payload: documentId and sellerId are required', 400)
    }

    const supabase = createServiceClient()

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, title, file_path, land_id')
      .eq('id', body.documentId)
      .single()

    if (documentError || !document) {
      return errorResponse(`Document not found: ${documentError?.message ?? 'unknown error'}`)
    }

    const { data: seller, error: sellerError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', body.sellerId)
      .single()

    if (sellerError || !seller?.email) {
      return errorResponse(`Seller profile not found: ${sellerError?.message ?? 'missing email'}`)
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
    return errorResponse(message)
  }
})
