import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { requireAuthenticatedStaff } from '../_shared/auth.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import {
  RECEIPTS_BUCKET,
  buildReceiptNumber,
  generateReceiptPdf,
} from '../_shared/receiptPdf.ts'
import { createServiceClient } from '../_shared/supabaseAdmin.ts'

interface ConfirmPaymentPayload {
  paymentId?: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    await requireAuthenticatedStaff(req)

    const payload = (await req.json()) as ConfirmPaymentPayload
    const paymentId = payload.paymentId?.trim()

    if (!paymentId) {
      return errorResponse('paymentId is required', 400)
    }

    const supabase = createServiceClient()

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, land_id, amount_usd, amount_ugx, method, status')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return errorResponse('Payment not found', 404)
    }

    const { data: existingReceipt } = await supabase
      .from('receipts')
      .select('receipt_number')
      .eq('payment_id', paymentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (payment.status === 'confirmed' && existingReceipt?.receipt_number) {
      return jsonResponse({
        success: true,
        receiptNumber: existingReceipt.receipt_number,
        alreadyConfirmed: true,
      })
    }

    const { data: land, error: landError } = await supabase
      .from('land_records')
      .select('seller_id, title')
      .eq('id', payment.land_id)
      .single()

    if (landError || !land?.seller_id) {
      return errorResponse('This land record has no seller assigned.', 400)
    }

    const { data: seller } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', land.seller_id)
      .single()

    if (payment.status !== 'confirmed') {
      const { error: updateError } = await supabase
        .from('payments')
        .update({ status: 'confirmed' })
        .eq('id', paymentId)
        .neq('status', 'confirmed')

      if (updateError) {
        return errorResponse(`Could not confirm payment: ${updateError.message}`)
      }
    }

    if (existingReceipt?.receipt_number) {
      return jsonResponse({
        success: true,
        receiptNumber: existingReceipt.receipt_number,
      })
    }

    const year = new Date().getFullYear()
    const yearStart = `${year}-01-01T00:00:00.000Z`
    const { count } = await supabase
      .from('receipts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yearStart)

    let receiptNumber = buildReceiptNumber(count ?? 0, year)
    const issuedAt = new Date().toISOString()
    const sellerName = seller?.full_name ?? seller?.email ?? 'Seller'

    for (let attempt = 0; attempt < 5; attempt++) {
      const pdfPath = `${land.seller_id}/${receiptNumber}.pdf`
      const pdfBytes = await generateReceiptPdf({
        receiptNumber,
        landTitle: land.title,
        sellerName,
        amountUsd: Number(payment.amount_usd),
        amountUgx: payment.amount_ugx != null ? Number(payment.amount_ugx) : null,
        method: payment.method,
        issuedAt,
      })

      const { error: uploadError } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .upload(pdfPath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError && !uploadError.message.toLowerCase().includes('already exists')) {
        return errorResponse(`Receipt PDF upload failed: ${uploadError.message}`)
      }

      const uploaded = !uploadError

      const { error: receiptError } = await supabase.from('receipts').insert({
        payment_id: paymentId,
        seller_id: land.seller_id,
        receipt_number: receiptNumber,
        pdf_path: pdfPath,
      })

      if (!receiptError) {
        return jsonResponse({ success: true, receiptNumber })
      }

      if (uploaded) {
        await supabase.storage.from(RECEIPTS_BUCKET).remove([pdfPath])
      }

      const isUniqueViolation =
        receiptError.code === '23505' ||
        receiptError.message.toLowerCase().includes('duplicate')

      if (!isUniqueViolation) {
        return errorResponse(`Receipt record could not be created: ${receiptError.message}`)
      }

      receiptNumber = buildReceiptNumber((count ?? 0) + attempt + 1, year)
    }

    return errorResponse('Could not allocate a unique receipt number')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return errorResponse(message, status)
  }
})
