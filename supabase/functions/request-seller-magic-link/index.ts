/// <reference path="../_shared/deno.d.ts" />
import { RateLimitError, assertRateLimit } from '../_shared/rateLimit.ts'
import { sellerMagicLinkEmail } from '../_shared/emailTemplates.ts'
import { errorResponse, handleCorsPreflight, jsonResponse } from '../_shared/http.ts'
import { sendEmail } from '../_shared/resend.ts'
import { getEnv } from '../_shared/env.ts'
import { createServiceClient, getAppUrl } from '../_shared/supabaseAdmin.ts'

interface RequestPayload {
  email?: string
}

const GENERIC_SUCCESS =
  'If this email is registered as a seller, you will receive a sign-in link shortly.'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function publicEmailError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('resend_api_key') || lower.includes('not configured')) {
    return 'Email delivery is not configured on the server. Contact support.'
  }
  if (lower.includes('failed to send email') || lower.includes('resend')) {
    return 'Could not send the sign-in email. Please try again in a few minutes.'
  }
  return 'Could not send the sign-in link. Please try again.'
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    let body: RequestPayload
    try {
      body = (await req.json()) as RequestPayload
    } catch {
      return errorResponse('Request body must be JSON with an email field.', 400)
    }

    if (!body.email || typeof body.email !== 'string') {
      return errorResponse('Email is required', 400)
    }

    const email = normalizeEmail(body.email)
    if (!email.includes('@')) {
      return errorResponse('Enter a valid email address.', 400)
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'

    const supabase = createServiceClient()

    try {
      await assertRateLimit(supabase, `magic-link:email:${email}`, 5, 3_600)
      await assertRateLimit(supabase, `magic-link:ip:${clientIp}`, 30, 3_600)
    } catch (error) {
      if (error instanceof RateLimitError) {
        return errorResponse(
          'Too many sign-in requests. Please wait and try again later.',
          429,
        )
      }
      throw error
    }

    const { data: seller, error: sellerError } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active')
      .eq('email', email)
      .maybeSingle()

    if (sellerError) {
      console.error('seller lookup failed:', sellerError.message)
      return errorResponse('Could not verify seller account. Please try again.', 500)
    }

    // Do not reveal whether the email exists / is a seller.
    if (!seller || seller.role !== 'seller' || seller.is_active === false) {
      return jsonResponse({ success: true, message: GENERIC_SUCCESS })
    }

    const appUrl = getAppUrl().replace(/\/$/, '')
    const redirectTo = `${appUrl}/seller/dashboard`

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: seller.email,
      options: { redirectTo },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('generateLink failed:', linkError?.message)
      return errorResponse(
        'Could not generate a sign-in link. Confirm Auth redirect URLs include this site.',
        500,
      )
    }

    const sellerName = seller.full_name ?? seller.email
    const magicLink = linkData.properties.action_link

    // Local without RESEND logs via sendEmail skip; production fails closed.
    if (!getEnv('RESEND_API_KEY')) {
      console.log(`[dev] Seller magic link for ${seller.email}: ${magicLink}`)
    }

    try {
      await sendEmail({
        to: seller.email,
        subject: 'Your SashaCrush seller sign-in link',
        html: sellerMagicLinkEmail({
          sellerName,
          magicLink,
          portalUrl: redirectTo,
        }),
      })
    } catch (emailError) {
      const raw = emailError instanceof Error ? emailError.message : 'email failed'
      console.error('magic-link email failed:', raw)
      return errorResponse(publicEmailError(raw), 502)
    }

    return jsonResponse({ success: true, message: GENERIC_SUCCESS })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    console.error('request-seller-magic-link crashed:', message)
    return errorResponse('Unexpected server error while requesting sign-in link.', 500)
  }
})
