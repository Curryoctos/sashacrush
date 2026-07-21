import { getEnv, requireEnv } from './env.ts'

export interface SendEmailParams {
  to: string
  subject: string
  html: string
}

const RESEND_API_URL = 'https://api.resend.com/emails'
const DEFAULT_FROM = 'notifications@sashacrush.com'

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const apiKey = getEnv('RESEND_API_KEY')
  if (!apiKey) {
    console.warn('[sendEmail] RESEND_API_KEY not set — skipping email delivery')
    console.warn('[sendEmail] To:', params.to, '| Subject:', params.subject)
    return
  }

  const from = getEnv('RESEND_FROM_EMAIL') ?? DEFAULT_FROM

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Resend API error:', response.status, errorBody)
      throw new Error(`Failed to send email: ${response.status} ${errorBody}`)
    }

    const result = await response.json()
    console.log('Email sent successfully:', { to: params.to, subject: params.subject, id: result.id })
  } catch (error) {
    console.error('sendEmail failed:', error)
    throw error instanceof Error ? error : new Error('Failed to send email')
  }
}
