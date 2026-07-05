import { describe, expect, it } from 'vitest'
import {
  documentSentEmail,
  newReceiptEmail,
  paymentConfirmedEmail,
} from '../../../supabase/functions/_shared/emailTemplates.ts'
import { sendEmail } from '../../../supabase/functions/_shared/resend.ts'

describe('email templates', () => {
  it('newReceiptEmail contains receipt number in output', () => {
    const html = newReceiptEmail({
      sellerName: 'Mubende Seller',
      receiptNumber: 'RCP-2026-0001',
      amountUsd: 50000,
      amountUgx: 185000000,
      landTitle: 'Mubende Land',
      portalUrl: 'http://localhost:5173/seller/dashboard',
    })

    expect(html).toContain('RCP-2026-0001')
    expect(html).toContain('SashaCrush')
    expect(html).toContain('Mubende Land')
  })

  it('documentSentEmail contains signing URL in output', () => {
    const signingUrl = 'http://localhost:5173/seller/documents?sign=abc-123'
    const html = documentSentEmail({
      recipientName: 'Mubende Seller',
      documentName: 'Land Agreement.pdf',
      landTitle: 'Mubende Land',
      signingUrl,
    })

    expect(html).toContain(signingUrl)
    expect(html).toContain('Sign Document')
  })

  it('paymentConfirmedEmail contains amount in output', () => {
    const html = paymentConfirmedEmail({
      adminName: 'SashaCrush Admin',
      amountUsd: 50000,
      amountUgx: 185000000,
      method: 'manual',
      landTitle: 'Mubende Land',
      receiptNumber: 'RCP-2026-0001',
      portalUrl: 'http://localhost:5173/admin/dashboard',
    })

    expect(html).toContain('$50,000.00')
    expect(html).toContain('RCP-2026-0001')
    expect(html).toContain('SashaCrush · CurryOctos · sashacrush.com')
  })
})

describe('sendEmail', () => {
  it('throws if RESEND_API_KEY is missing', async () => {
    const host = globalThis as { process?: { env?: Record<string, string | undefined> } }
    const saved = host.process?.env?.RESEND_API_KEY
    if (host.process?.env) {
      delete host.process.env.RESEND_API_KEY
    }

    await expect(
      sendEmail({
        to: 'seller@sashacrush.com',
        subject: 'Test',
        html: '<p>Test</p>',
      }),
    ).rejects.toThrow('RESEND_API_KEY')

    if (saved !== undefined && host.process?.env) {
      host.process.env.RESEND_API_KEY = saved
    }
  })
})
