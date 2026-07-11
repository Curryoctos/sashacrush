import { describe, expect, it } from 'vitest'
import {
  adminMessageEmail,
  documentSentEmail,
  newReceiptEmail,
  paymentConfirmedEmail,
  sellerAssignedEmail,
  sellerMagicLinkEmail,
  sellerMessageEmail,
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
      portalUrl: 'http://localhost:5173/seller/receipts',
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

  it('sellerAssignedEmail contains property and portal URL', () => {
    const portalUrl = 'http://localhost:5173/seller/dashboard'
    const html = sellerAssignedEmail({
      sellerName: 'Mubende Seller',
      landTitle: 'Mubende Land',
      location: 'Mubende District, Uganda',
      portalUrl,
    })

    expect(html).toContain('Mubende Land')
    expect(html).toContain(portalUrl)
  })

  it('sellerMessageEmail contains message preview', () => {
    const html = sellerMessageEmail({
      adminName: 'SashaCrush Admin',
      sellerName: 'Mubende Seller',
      landTitle: 'Mubende Land',
      messagePreview: 'When will the survey be complete?',
      portalUrl: 'http://localhost:5173/admin/chat',
    })

    expect(html).toContain('When will the survey be complete?')
    expect(html).toContain('Mubende Seller')
  })

  it('sellerMagicLinkEmail contains magic link and portal URL', () => {
    const magicLink = 'http://localhost:5173/auth/callback?token=abc'
    const portalUrl = 'http://localhost:5173/seller/dashboard'
    const html = sellerMagicLinkEmail({
      sellerName: 'Mubende Seller',
      magicLink,
      portalUrl,
    })

    expect(html).toContain(magicLink)
    expect(html).toContain(portalUrl)
    expect(html).toContain('Sign In to SashaCrush')
  })

  it('adminMessageEmail contains message preview and portal URL', () => {
    const portalUrl = 'http://localhost:5173/seller/chat'
    const html = adminMessageEmail({
      sellerName: 'Mubende Seller',
      landTitle: 'Mubende Land',
      messagePreview: 'Your survey documents are ready for review.',
      portalUrl,
    })

    expect(html).toContain('Your survey documents are ready for review.')
    expect(html).toContain(portalUrl)
    expect(html).toContain('View Messages')
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
