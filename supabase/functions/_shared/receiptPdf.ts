import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

export interface ReceiptPdfParams {
  receiptNumber: string
  landTitle: string
  sellerName: string
  amountUsd: number
  amountUgx: number | null
  method: string | null
  issuedAt: string
}

export async function generateReceiptPdf(params: ReceiptPdfParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  page.drawText('SashaCrush', {
    x: 50,
    y: 720,
    size: 24,
    font: fontBold,
    color: rgb(0.18, 0.42, 0.31),
  })

  page.drawText('Payment Receipt', {
    x: 50,
    y: 690,
    size: 18,
    font: fontBold,
  })

  const lines = [
    `Receipt number: ${params.receiptNumber}`,
    `Property: ${params.landTitle}`,
    `Seller: ${params.sellerName}`,
    `Amount (USD): $${params.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    params.amountUgx != null
      ? `Amount (UGX): ${params.amountUgx.toLocaleString('en-UG')}`
      : null,
    params.method ? `Payment method: ${params.method}` : null,
    `Issued: ${new Date(params.issuedAt).toLocaleString()}`,
  ].filter(Boolean) as string[]

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: 50,
      y: 640 - index * 24,
      size: 12,
      font,
    })
  })

  page.drawText('SashaCrush · CurryOctos · sashacrush.com', {
    x: 50,
    y: 60,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  })

  return pdfDoc.save()
}

export const RECEIPTS_BUCKET = 'receipts'

export function buildReceiptNumber(existingCount: number, year = new Date().getFullYear()): string {
  const sequence = String(existingCount + 1).padStart(4, '0')
  return `RCP-${year}-${sequence}`
}
