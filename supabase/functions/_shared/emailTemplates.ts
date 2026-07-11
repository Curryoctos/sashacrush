interface EmailLayoutParams {
  bodyHtml: string
}

function emailLayout({ bodyHtml }: EmailLayoutParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SashaCrush</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 16px;text-align:center;">
              <h1 style="margin:0;color:#2D6A4F;font-size:28px;font-weight:bold;">SashaCrush</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;color:#333333;font-size:16px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#f9fafb;text-align:center;color:#6b7280;font-size:12px;">
              SashaCrush · CurryOctos · sashacrush.com
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(label: string, url: string): string {
  return `<p style="margin:24px 0 0;text-align:center;">
  <a href="${url}" style="display:inline-block;background-color:#2D6A4F;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:16px;">${label}</a>
</p>`
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function formatUgx(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function newReceiptEmail(params: {
  sellerName: string
  receiptNumber: string
  amountUsd: number
  amountUgx: number
  landTitle: string
  portalUrl: string
}): string {
  const bodyHtml = `
    <p style="margin:0 0 16px;">Hello ${params.sellerName},</p>
    <p style="margin:0 0 16px;">Your payment receipt is ready for <strong>${params.landTitle}</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;background-color:#f9fafb;border-radius:6px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 8px;"><strong>Receipt number:</strong> ${params.receiptNumber}</p>
          <p style="margin:0 0 8px;"><strong>Amount (USD):</strong> ${formatUsd(params.amountUsd)}</p>
          <p style="margin:0;"><strong>Amount (UGX):</strong> ${formatUgx(params.amountUgx)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;">You can view and download your receipt in the seller portal.</p>
    ${ctaButton('View Receipt', params.portalUrl)}
  `

  return emailLayout({ bodyHtml })
}

export function documentSentEmail(params: {
  recipientName: string
  documentName: string
  landTitle: string
  signingUrl: string
}): string {
  const bodyHtml = `
    <p style="margin:0 0 16px;">Hello ${params.recipientName},</p>
    <p style="margin:0 0 16px;">A document requires your signature for <strong>${params.landTitle}</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;background-color:#f9fafb;border-radius:6px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0;"><strong>Document:</strong> ${params.documentName}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;">Please review and sign the document at your earliest convenience.</p>
    ${ctaButton('Sign Document', params.signingUrl)}
  `

  return emailLayout({ bodyHtml })
}

export function documentSignedEmail(params: {
  adminName: string
  documentName: string
  signedByName: string
  landTitle: string
  portalUrl: string
}): string {
  const bodyHtml = `
    <p style="margin:0 0 16px;">Hello ${params.adminName},</p>
    <p style="margin:0 0 16px;"><strong>${params.signedByName}</strong> has signed a document for <strong>${params.landTitle}</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;background-color:#f9fafb;border-radius:6px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0;"><strong>Document:</strong> ${params.documentName}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;">The signed document is now available in the admin portal.</p>
    ${ctaButton('View Documents', params.portalUrl)}
  `

  return emailLayout({ bodyHtml })
}

export function paymentConfirmedEmail(params: {
  adminName: string
  amountUsd: number
  amountUgx: number
  method: string
  landTitle: string
  receiptNumber: string
  portalUrl: string
}): string {
  const bodyHtml = `
    <p style="margin:0 0 16px;">Hello ${params.adminName},</p>
    <p style="margin:0 0 16px;">A payment has been confirmed for <strong>${params.landTitle}</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;background-color:#f9fafb;border-radius:6px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 8px;"><strong>Amount (USD):</strong> ${formatUsd(params.amountUsd)}</p>
          <p style="margin:0 0 8px;"><strong>Amount (UGX):</strong> ${formatUgx(params.amountUgx)}</p>
          <p style="margin:0 0 8px;"><strong>Method:</strong> ${params.method}</p>
          <p style="margin:0;"><strong>Receipt number:</strong> ${params.receiptNumber}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;">View payment details in the admin portal.</p>
    ${ctaButton('View Portal', params.portalUrl)}
  `

  return emailLayout({ bodyHtml })
}

export function sellerAssignedEmail(params: {
  sellerName: string
  landTitle: string
  location: string
  portalUrl: string
}): string {
  const bodyHtml = `
    <p style="margin:0 0 16px;">Hello ${params.sellerName},</p>
    <p style="margin:0 0 16px;">You have been assigned to a property on SashaCrush.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;background-color:#f9fafb;border-radius:6px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 8px;"><strong>Property:</strong> ${params.landTitle}</p>
          <p style="margin:0;"><strong>Location:</strong> ${params.location}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;">Sign in to your seller portal to view details, messages, and documents.</p>
    ${ctaButton('Open Seller Portal', params.portalUrl)}
  `

  return emailLayout({ bodyHtml })
}

export function sellerMessageEmail(params: {
  adminName: string
  sellerName: string
  landTitle: string
  messagePreview: string
  portalUrl: string
}): string {
  const preview =
    params.messagePreview.length > 200
      ? `${params.messagePreview.slice(0, 200)}…`
      : params.messagePreview

  const bodyHtml = `
    <p style="margin:0 0 16px;">Hello ${params.adminName},</p>
    <p style="margin:0 0 16px;"><strong>${params.sellerName}</strong> sent a new message about <strong>${params.landTitle}</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;background-color:#f9fafb;border-radius:6px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0;font-style:italic;">"${preview}"</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;">Reply in the admin messages portal.</p>
    ${ctaButton('View Messages', params.portalUrl)}
  `

  return emailLayout({ bodyHtml })
}

export function adminMessageEmail(params: {
  sellerName: string
  landTitle: string
  messagePreview: string
  portalUrl: string
}): string {
  const preview =
    params.messagePreview.length > 200
      ? `${params.messagePreview.slice(0, 200)}…`
      : params.messagePreview

  const bodyHtml = `
    <p style="margin:0 0 16px;">Hello ${params.sellerName},</p>
    <p style="margin:0 0 16px;">You have a new message from the SashaCrush team about <strong>${params.landTitle}</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;background-color:#f9fafb;border-radius:6px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0;font-style:italic;">"${preview}"</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;">Reply in your seller messages portal.</p>
    ${ctaButton('View Messages', params.portalUrl)}
  `

  return emailLayout({ bodyHtml })
}

export function sellerMagicLinkEmail(params: {
  sellerName: string
  magicLink: string
  portalUrl: string
}): string {
  const bodyHtml = `
    <p style="margin:0 0 16px;">Hello ${params.sellerName},</p>
    <p style="margin:0 0 16px;">Use the button below to sign in to your SashaCrush seller portal. This link expires soon and can only be used once.</p>
    ${ctaButton('Sign In to SashaCrush', params.magicLink)}
    <p style="margin:16px 0 0;font-size:14px;color:#6b7280;">After signing in you can always return to ${params.portalUrl}</p>
  `

  return emailLayout({ bodyHtml })
}
