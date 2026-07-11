import { generateReceiptPdf, RECEIPTS_BUCKET } from '@/features/payments/receiptPdf'
import { supabase } from '@/lib/supabase'

export function buildReceiptNumber(existingCount: number): string {
  const year = new Date().getFullYear()
  const sequence = String(existingCount + 1).padStart(4, '0')
  return `RCP-${year}-${sequence}`
}

interface ConfirmPaymentInput {
  paymentId: string
  landId: string
  amountUsd: number
  amountUgx: number | null
  method: string | null
}

export async function confirmPaymentWithReceipt({
  paymentId,
  landId,
  amountUsd,
  amountUgx,
  method,
}: ConfirmPaymentInput): Promise<string> {
  const { data: land, error: landError } = await supabase
    .from('land_records')
    .select('seller_id, title')
    .eq('id', landId)
    .single()

  if (landError || !land?.seller_id) {
    throw new Error('This land record has no seller assigned.')
  }

  const { data: seller } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', land.seller_id)
    .single()

  const { error: updateError } = await supabase
    .from('payments')
    .update({ status: 'confirmed' })
    .eq('id', paymentId)

  if (updateError) {
    throw updateError
  }

  const yearStart = `${new Date().getFullYear()}-01-01T00:00:00.000Z`
  const { count } = await supabase
    .from('receipts')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', yearStart)

  const receiptNumber = buildReceiptNumber(count ?? 0)
  const issuedAt = new Date().toISOString()
  const sellerName = seller?.full_name ?? seller?.email ?? 'Seller'

  const pdfBytes = await generateReceiptPdf({
    receiptNumber,
    landTitle: land.title,
    sellerName,
    amountUsd,
    amountUgx,
    method,
    issuedAt,
  })

  const pdfPath = `${land.seller_id}/${receiptNumber}.pdf`

  const { error: uploadError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(pdfPath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    throw new Error('Payment confirmed but receipt PDF upload failed.')
  }

  const { error: receiptError } = await supabase.from('receipts').insert({
    payment_id: paymentId,
    seller_id: land.seller_id,
    receipt_number: receiptNumber,
    pdf_path: pdfPath,
  })

  if (receiptError) {
    await supabase.storage.from(RECEIPTS_BUCKET).remove([pdfPath])
    throw new Error('Payment confirmed but receipt record could not be created.')
  }

  return receiptNumber
}
