/// <reference path="../_shared/deno.d.ts" />
import { requireAuthenticatedUser } from '../_shared/auth.ts'
import { getEnv } from '../_shared/env.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { assertRateLimit, RateLimitError } from '../_shared/rateLimit.ts'
import {
  createStripeCheckoutSession,
  getStripeSecretKey,
} from '../_shared/stripe.ts'
import { createServiceClient } from '../_shared/supabaseAdmin.ts'

interface InitiateInvestmentCheckoutPayload {
  amountUsd?: number
  notes?: string | null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const user = await requireAuthenticatedUser(req)

    if (user.role !== 'executive') {
      return errorResponse('Only executives can fund the capital pool via Stripe', 403)
    }

    if (!getStripeSecretKey()) {
      return errorResponse('STRIPE_SECRET_KEY is not configured', 503)
    }

    const appUrl = getEnv('APP_URL')?.replace(/\/$/, '')
    if (!appUrl) {
      return errorResponse('APP_URL is not configured', 503)
    }

    const payload = (await req.json()) as InitiateInvestmentCheckoutPayload
    const amountUsd = Number(payload.amountUsd)
    const notes = payload.notes?.trim() || null

    if (!Number.isFinite(amountUsd) || amountUsd < 0.5) {
      return errorResponse('Amount must be at least $0.50', 400)
    }

    if (notes && notes.length > 1000) {
      return errorResponse('Notes must be 1000 characters or fewer', 400)
    }

    const supabase = createServiceClient()

    try {
      await assertRateLimit(
        supabase,
        `initiate-investment-checkout:${user.userId}`,
        20,
        3_600,
      )
    } catch (error) {
      if (error instanceof RateLimitError) {
        return errorResponse(error.message, 429)
      }
      throw error
    }

    const investmentId = crypto.randomUUID()
    const reference = `sc-invest-${investmentId.replace(/-/g, '').slice(0, 16)}`

    const { data: profile } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.userId)
      .maybeSingle()

    const { error: insertError } = await supabase.from('investments').insert({
      id: investmentId,
      executive_id: user.userId,
      amount_usd: amountUsd,
      method: 'stripe',
      reference,
      notes,
      status: 'pending',
    })

    if (insertError) {
      return errorResponse(insertError.message || 'Could not create investment', 400)
    }

    const successUrl = `${appUrl}/executive/investments?stripe=success&investment=${investmentId}`
    const cancelUrl = `${appUrl}/executive/investments?stripe=cancel&investment=${investmentId}`

    let session
    try {
      session = await createStripeCheckoutSession({
        amountUsd,
        productName: 'SashaCrush — Company capital contribution',
        successUrl,
        cancelUrl,
        customerEmail: profile?.email ?? null,
        metadata: { investment_id: investmentId },
      })
    } catch (sessionError) {
      await supabase
        .from('investments')
        .update({
          status: 'rejected',
          rejection_reason: 'Stripe Checkout could not be started',
        })
        .eq('id', investmentId)
        .eq('status', 'pending')
      const message =
        sessionError instanceof Error
          ? sessionError.message
          : 'Stripe Checkout session creation failed'
      return errorResponse(message, 502)
    }

    if (!session.url) {
      await supabase
        .from('investments')
        .update({
          status: 'rejected',
          rejection_reason: 'Stripe Checkout did not return a URL',
        })
        .eq('id', investmentId)
        .eq('status', 'pending')
      return errorResponse('Stripe did not return a Checkout URL', 502)
    }

    const { error: linkError } = await supabase
      .from('investments')
      .update({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
      })
      .eq('id', investmentId)

    if (linkError) {
      console.error('Failed to store Stripe session on investment', linkError.message)
    }

    return jsonResponse({
      success: true,
      investmentId,
      reference,
      checkoutUrl: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return errorResponse(message, status)
  }
})
