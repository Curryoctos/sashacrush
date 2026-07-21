import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { RateLimitError, assertRateLimit } from '../_shared/rateLimit.ts'
import { sellerMagicLinkEmail } from '../_shared/emailTemplates.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { sendEmail } from '../_shared/resend.ts'
import { getEnv } from '../_shared/env.ts'
import { createServiceClient, getAppUrl } from '../_shared/supabaseAdmin.ts'

interface RequestPayload {
  email: string
}

const GENERIC_SUCCESS =
  'If this email is registered as a seller, you will receive a sign-in link shortly.'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const body = (await req.json()) as RequestPayload

    if (!body.email) {
      return errorResponse('Email is required', 400)
    }

    const email = normalizeEmail(body.email)
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
        return errorResponse(error.message, 429)
      }
      throw error
    }

    const { data: seller, error: sellerError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('email', email)
      .maybeSingle()

    if (sellerError) {
      return errorResponse(`Could not verify seller: ${sellerError.message}`)
    }

    if (!seller || seller.role !== 'seller') {
      return jsonResponse({ success: true, message: GENERIC_SUCCESS })
    }

    const redirectTo = `${getAppUrl()}/seller/dashboard`

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: seller.email,
      options: { redirectTo },
    })

    if (linkError || !linkData.properties.action_link) {
      return errorResponse(linkError?.message ?? 'Could not generate magic link')
    }

    const sellerName = seller.full_name ?? seller.email
    const magicLink = linkData.properties.action_link

    if (!getEnv('RESEND_API_KEY')) {
      console.log(`[dev] Seller magic link for ${seller.email}: ${magicLink}`)
    } else {
      await sendEmail({
        to: seller.email,
        subject: 'Your SashaCrush seller sign-in link',
        html: sellerMagicLinkEmail({
          sellerName,
          magicLink,
          portalUrl: redirectTo,
        }),
      })
    }

    return jsonResponse({ success: true, message: GENERIC_SUCCESS })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return errorResponse(message)
  }
})
