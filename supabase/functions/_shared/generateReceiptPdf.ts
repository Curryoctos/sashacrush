import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1'

export interface ReceiptPdfParams {
  receiptNumber: string
  landTitle: string
  landReference: string
  sellerName: string
  amountUsd: number
  amountUgx: number
  rateUsed: number // 1 USD = X UGX
  transactionId: string
  confirmedAt: string // ISO datetime string
}

/**
 * Generates a professional A4 receipt PDF.
 * Returns raw bytes — caller uploads to Supabase Storage.
 *
 * IMPORTANT: This PDF does NOT include payment method.
 * Payment method is stored in the payments table (admin only).
 * The receipt is safe to share with the seller.
 */
export async function generateReceiptPdf(p: ReceiptPdfParams): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89]) // A4 in points
  const { width, height } = page.getSize()

  // ── Fonts ─────────────────────────────────────────────────
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)

  // ── Colours ───────────────────────────────────────────────
  const green = rgb(0.106, 0.416, 0.306) // #1B6A4E
  const orange = rgb(0.753, 0.243, 0.196) // #C03E32
  const black = rgb(0.102, 0.102, 0.102) // #1A1A1A
  const gray = rgb(0.42, 0.42, 0.42) // #6B6B6B
  const lgray = rgb(0.878, 0.878, 0.878) // #E0E0E0

  // ── Header block ─────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: height - 90,
    width,
    height: 90,
    color: green,
  })

  page.drawText('SASHACRUSH', {
    x: 50,
    y: height - 42,
    font: bold,
    size: 26,
    color: rgb(1, 1, 1),
  })

  page.drawText('Official Payment Receipt', {
    x: 50,
    y: height - 66,
    font: regular,
    size: 12,
    color: rgb(0.85, 0.95, 0.87),
  })

  page.drawText(p.receiptNumber, {
    x: width - 200,
    y: height - 52,
    font: bold,
    size: 13,
    color: rgb(1, 1, 1),
  })

  // ── Orange accent line ────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: height - 94,
    width,
    height: 4,
    color: orange,
  })

  // ── Receipt fields ────────────────────────────────────────
  const formatUsd = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  const formatUgx = (n: number) => `${Math.round(n).toLocaleString('en-UG')} UGX`

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toUTCString().replace('GMT', 'UTC')
  }

  const fields: Array<{ label: string; value: string; highlight?: boolean }> = [
    { label: 'Receipt Number', value: p.receiptNumber, highlight: true },
    { label: 'Date & Time', value: formatDate(p.confirmedAt) },
    { label: 'Land Reference', value: p.landReference },
    { label: 'Property', value: p.landTitle },
    { label: 'Recipient', value: p.sellerName },
    { label: 'Amount (USD)', value: formatUsd(p.amountUsd), highlight: true },
    { label: 'Amount (UGX)', value: formatUgx(p.amountUgx), highlight: true },
    {
      label: 'Exchange Rate',
      value: `1 USD = ${p.rateUsed.toLocaleString('en-US', { minimumFractionDigits: 2 })} UGX`,
    },
    { label: 'Transaction ID', value: p.transactionId },
    { label: 'Payment Status', value: 'CONFIRMED', highlight: true },
  ]

  const labelX = 50
  const valueX = 230
  const rowH = 36
  let y = height - 130

  for (const field of fields) {
    page.drawLine({
      start: { x: 50, y: y + 20 },
      end: { x: width - 50, y: y + 20 },
      thickness: 0.5,
      color: lgray,
    })

    page.drawText(field.label, {
      x: labelX,
      y,
      font: regular,
      size: 10,
      color: gray,
    })

    page.drawText(field.value, {
      x: valueX,
      y,
      font: field.highlight ? bold : regular,
      size: field.highlight ? 11 : 10,
      color: field.label === 'Payment Status' ? green : black,
    })

    y -= rowH
  }

  // ── CONFIRMED stamp ───────────────────────────────────────
  // Helvetica cannot encode Unicode checkmarks — use ASCII label.
  page.drawRectangle({
    x: width - 175,
    y: 200,
    width: 120,
    height: 40,
    borderColor: green,
    borderWidth: 2,
    color: rgb(0.9, 1.0, 0.93),
  })

  page.drawText('CONFIRMED', {
    x: width - 158,
    y: 216,
    font: bold,
    size: 13,
    color: green,
  })

  // ── Footer ────────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height: 80,
    color: rgb(0.96, 0.96, 0.96),
  })

  page.drawLine({
    start: { x: 0, y: 80 },
    end: { x: width, y: 80 },
    thickness: 3,
    color: orange,
  })

  page.drawText('This receipt is an official record of payment issued by SashaCrush.', {
    x: 50,
    y: 56,
    font: regular,
    size: 9,
    color: gray,
  })

  page.drawText('SashaCrush  ·  CurryOctos  ·  sashacrush.com', {
    x: 50,
    y: 40,
    font: bold,
    size: 9,
    color: gray,
  })

  page.drawText(`Digitally generated on ${new Date().toISOString()} by SashaCrush`, {
    x: 50,
    y: 24,
    font: regular,
    size: 8,
    color: lgray,
  })

  return doc.save({ useObjectStreams: false })
}

export const RECEIPTS_BUCKET = 'receipts'
