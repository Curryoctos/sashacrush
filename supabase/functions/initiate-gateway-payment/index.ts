/// <reference path="../_shared/deno.d.ts" />
import { requireAuthenticatedStaff } from '../_shared/auth.ts'
import { createFlutterwavePaymentLink, getFlutterwaveSecretKey } from '../_shared/flutterwave.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { assertRateLimit, RateLimitError } from '../_shared/rateLimit.ts'
import { createStripeCheckoutSession, getStripeSecretKey } from '../_shared/stripe.ts'
import { createServiceClient, getAppUrl } from '../_shared/supabaseAdmin.ts'

interface InitiatePayload {
  paymentId?: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const staff = await requireAuthenticatedStaff(req)
    const payload = (await req.json()) as InitiatePayload
    const paymentId = payload.paymentId?.trim()

    if (!paymentId) {
      return errorResponse('paymentId is required', 400)
    }

    const supabase = createServiceClient()

    try {
      await assertRateLimit(
        supabase,
        `initiate-gateway-payment:${staff.userId}`,
        40,
        3_600,
      )
    } catch (error) {
      if (error instanceof RateLimitError) {
        return errorResponse(error.message, 429)
      }
      throw error
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(
        'id, land_id, amount_usd, amount_ugx, method, status, stripe_payment_intent_id, flutterwave_tx_ref, gateway_checkout_url, mobile_money_network',
      )
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return errorResponse('Payment not found', 404)
    }

    if (payment.status === 'confirmed') {
      return errorResponse('Payment is already confirmed', 400)
    }

    if (payment.method !== 'stripe' && payment.method !== 'flutterwave') {
      return errorResponse('Payment method must be stripe or flutterwave', 400)
    }

    if (payment.gateway_checkout_url) {
      return jsonResponse({
        success: true,
        checkoutUrl: payment.gateway_checkout_url,
        reused: true,
      })
    }

    const { data: land, error: landError } = await supabase
      .from('land_records')
      .select('title, seller_id')
      .eq('id', payment.land_id)
      .single()

    if (landError || !land) {
      return errorResponse('Land record not found', 404)
    }

    const { data: staffProfile } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', staff.userId)
      .single()

    const appUrl = getAppUrl().replace(/\/$/, '')
    const successUrl = `${appUrl}/admin/payments?land=${payment.land_id}&gateway=success`
    const cancelUrl = `${appUrl}/admin/payments?land=${payment.land_id}&gateway=cancelled`

    if (payment.method === 'stripe') {
      if (!getStripeSecretKey()) {
        return errorResponse(
          'STRIPE_SECRET_KEY is not configured. Set it in Supabase Edge Function secrets.',
          503,
        )
      }

      const session = await createStripeCheckoutSession({
        amountUsd: Number(payment.amount_usd),
        paymentId: payment.id,
        landTitle: land.title,
        successUrl,
        cancelUrl,
        customerEmail: staffProfile?.email,
      })

      if (!session.url) {
        return errorResponse('Stripe did not return a checkout URL')
      }

      const { error: updateError } = await supabase
        .from('payments')
        .update({
          stripe_payment_intent_id: session.payment_intent ?? session.id,
          gateway_checkout_url: session.url,
        })
        .eq('id', payment.id)

      if (updateError) {
        return errorResponse(`Could not store Stripe session: ${updateError.message}`)
      }

      return jsonResponse({
        success: true,
        checkoutUrl: session.url,
        provider: 'stripe',
      })
    }

    if (!getFlutterwaveSecretKey()) {
      return errorResponse(
        'FLUTTERWAVE_SECRET_KEY is not configured. Set it in Supabase Edge Function secrets.',
        503,
      )
    }

    const flutterwave = await createFlutterwavePaymentLink({
      amountUsd: Number(payment.amount_usd),
      amountUgx: payment.amount_ugx != null ? Number(payment.amount_ugx) : null,
      paymentId: payment.id,
      landTitle: land.title,
      redirectUrl: successUrl,
      customerEmail: staffProfile?.email ?? 'payments@sashacrush.com',
      customerName: staffProfile?.full_name,
      mobileMoneyNetwork: payment.mobile_money_network,
    })

    const { error: updateError } = await supabase
      .from('payments')
      .update({
        flutterwave_tx_ref: flutterwave.txRef,
        gateway_checkout_url: flutterwave.link,
      })
      .eq('id', payment.id)

    if (updateError) {
      return errorResponse(`Could not store Flutterwave reference: ${updateError.message}`)
    }

    return jsonResponse({
      success: true,
      checkoutUrl: flutterwave.link,
      provider: 'flutterwave',
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return errorResponse(error.message, 429)
    }
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return errorResponse(message, status)
  }
})
