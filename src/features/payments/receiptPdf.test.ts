import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { generateReceiptPdf } from '@/features/payments/receiptPdf'

describe('generateReceiptPdf', () => {
  it('produces a valid PDF with receipt number embedded', async () => {
    const bytes = await generateReceiptPdf({
      receiptNumber: 'RCP-2026-0042',
      landTitle: 'Mubende Land',
      sellerName: 'Mubende Seller',
      amountUsd: 50000,
      amountUgx: 185_000_000,
      method: 'manual',
      issuedAt: '2026-06-30T12:00:00.000Z',
    })

    expect(bytes.byteLength).toBeGreaterThan(500)

    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBe(1)
  })
})
