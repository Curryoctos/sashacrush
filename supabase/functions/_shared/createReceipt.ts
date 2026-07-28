import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { RECEIPTS_BUCKET, generateReceiptPdf } from './generateReceiptPdf.ts'
import { generateReceiptNumber } from './receiptNumber.ts'

export interface CreateReceiptParams {
  supabase: SupabaseClient // must be service_role client
  paymentId: string
  landId: string
  sellerId: string
  amountUsd: number
  amountUgx: number
  rateUsed: number
  transactionId: string
  confirmedAt: string
}

export interface CreateReceiptResult {
  receiptNumber: string
  pdfPath: string
}

/**
 * Creates a receipt end-to-end:
 *   1. Generates sequential receipt number (with advisory lock)
 *   2. Fetches land and seller details
 *   3. Generates PDF bytes
 *   4. Uploads PDF to Supabase Storage
 *   5. Inserts receipt record in DB
 *   6. Updates payment record to confirmed
 *   7. Fires receipt notification (non-blocking)
 *
 * Throws on any failure. Caller must handle the error.
 * Notification failure does NOT throw — it logs and continues.
 *
 * Schema notes (SashaCrush):
 *   - Seller lives in public.users (not profiles)
 *   - receipt_number / pdf_path live on public.receipts (not payments)
 *   - payments.status is set to confirmed; amounts stay on the payment row
 */
export async function createReceipt(
  params: CreateReceiptParams,
): Promise<CreateReceiptResult> {
  // ── 1. Guard: check not already receipted ────────────────
  const { data: existingReceipt } = await params.supabase
    .from('receipts')
    .select('receipt_number, pdf_path')
    .eq('payment_id', params.paymentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingReceipt?.receipt_number) {
    console.log(
      `Payment ${params.paymentId} already has receipt ` +
        `${existingReceipt.receipt_number} — skipping`,
    )
    return {
      receiptNumber: existingReceipt.receipt_number,
      pdfPath:
        existingReceipt.pdf_path ??
        `${params.sellerId}/${existingReceipt.receipt_number}.pdf`,
    }
  }

  // ── 2. Fetch supporting data ──────────────────────────────
  const [landResult, sellerResult] = await Promise.all([
    params.supabase
      .from('land_records')
      .select('title, location')
      .eq('id', params.landId)
      .single(),
    params.supabase
      .from('users')
      .select('full_name, email')
      .eq('id', params.sellerId)
      .single(),
  ])

  if (landResult.error || !landResult.data) {
    throw new Error(
      `Land record not found for id ${params.landId}: ` +
        (landResult.error?.message ?? 'no data'),
    )
  }

  if (sellerResult.error || !sellerResult.data) {
    throw new Error(
      `Seller profile not found for id ${params.sellerId}: ` +
        (sellerResult.error?.message ?? 'no data'),
    )
  }

  const land = landResult.data
  const seller = sellerResult.data

  // ── 3. Generate receipt number (advisory lock inside) ─────
  const receiptNumber = await generateReceiptNumber(params.supabase)

  // ── 4. Generate PDF bytes ─────────────────────────────────
  const landReference =
    land.location?.toLowerCase().includes('mubende') || land.title.toLowerCase().includes('mubende')
      ? 'SC-MBD-001'
      : `SC-${params.landId.slice(0, 8).toUpperCase()}`

  const pdfBytes = await generateReceiptPdf({
    receiptNumber,
    landTitle: land.title,
    landReference,
    sellerName: seller.full_name ?? seller.email ?? 'Seller',
    amountUsd: params.amountUsd,
    amountUgx: params.amountUgx,
    rateUsed: params.rateUsed,
    transactionId: params.transactionId,
    confirmedAt: params.confirmedAt,
  })

  // ── 5. Upload PDF to Storage ──────────────────────────────
  const pdfPath = `${params.sellerId}/${receiptNumber}.pdf`

  const { error: uploadError } = await params.supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(pdfPath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: false, // never overwrite — fail if exists
    })

  if (uploadError) {
    throw new Error(`PDF upload failed: ${uploadError.message}`)
  }

  // ── 6. Insert receipt record ──────────────────────────────
  const { data: insertedReceipt, error: receiptError } = await params.supabase
    .from('receipts')
    .insert({
      payment_id: params.paymentId,
      seller_id: params.sellerId,
      receipt_number: receiptNumber,
      pdf_path: pdfPath,
      amount_usd: params.amountUsd,
      amount_ugx: params.amountUgx,
      rate_used: params.rateUsed,
      land_id: params.landId,
      land_title: land.title,
    })
    .select(
      'id, payment_id, seller_id, receipt_number, pdf_path, amount_usd, amount_ugx, land_id, land_title',
    )
    .single()

  if (receiptError || !insertedReceipt) {
    const isUniqueViolation =
      receiptError?.code === '23505' ||
      receiptError?.message?.toLowerCase().includes('duplicate') === true

    // Concurrent confirm: another worker won the UNIQUE(payment_id) race.
    if (isUniqueViolation) {
      await params.supabase.storage
        .from(RECEIPTS_BUCKET)
        .remove([pdfPath])
        .catch((e: unknown) => console.error('Rollback PDF delete failed:', e))

      const { data: winner } = await params.supabase
        .from('receipts')
        .select('receipt_number, pdf_path')
        .eq('payment_id', params.paymentId)
        .maybeSingle()

      if (winner?.receipt_number) {
        return {
          receiptNumber: winner.receipt_number,
          pdfPath: winner.pdf_path ?? `${params.sellerId}/${winner.receipt_number}.pdf`,
        }
      }
    }

    // Rollback: delete the uploaded PDF to avoid orphan files
    await params.supabase.storage
      .from(RECEIPTS_BUCKET)
      .remove([pdfPath])
      .catch((e: unknown) => console.error('Rollback PDF delete failed:', e))

    throw new Error(
      `Receipt DB insert failed: ${receiptError?.message ?? 'no receipt row returned'}`,
    )
  }

  // ── 7. Update payment record ──────────────────────────────
  const { error: paymentUpdateError } = await params.supabase
    .from('payments')
    .update({
      status: 'confirmed',
    })
    .eq('id', params.paymentId)

  if (paymentUpdateError) {
    throw new Error(`Payment update failed: ${paymentUpdateError.message}`)
  }

  // ── 8. Notify seller (non-blocking) ──────────────────────
  // Existing notify-receipt-created expects a receipt row (or webhook envelope)
  // and authenticates via service_role Authorization header.
  void params.supabase.functions
    .invoke('notify-receipt-created', {
      body: insertedReceipt,
    })
    .catch((err: unknown) =>
      console.error('notify-receipt-created failed (non-fatal):', err),
    )

  console.log(
    `Receipt created successfully: ${receiptNumber} ` +
      `for payment ${params.paymentId}`,
  )

  return { receiptNumber, pdfPath }
}
