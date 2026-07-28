/// <reference path="../_shared/deno.d.ts" />
import {
  ConfirmPaymentError,
  confirmPaymentAndIssueReceipt,
} from '../_shared/confirmPayment.ts'
import { claimGatewayWebhookEvent } from '../_shared/gatewayIdempotency.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { stripeAmountMatches } from '../_shared/paymentAmountGuard.ts'
import {
  getStripeWebhookSecret,
  verifyStripeWebhookSignature,
} from '../_shared/stripe.ts'
import { createServiceClient } from '../_shared/supabaseAdmin.ts'

interface StripeEvent {
  id?: string
  type?: string
  data?: {
    object?: {
      id?: string
      amount_total?: number
      amount?: number
      currency?: string
      metadata?: { payment_id?: string }
      payment_intent?: string | { id?: string } | null
      payment_status?: string
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const webhookSecret = getStripeWebhookSecret()
    if (!webhookSecret) {
      return errorResponse('STRIPE_WEBHOOK_SECRET is not configured', 503)
    }

    const payload = await req.text()
    const signature = req.headers.get('stripe-signature')
    const valid = await verifyStripeWebhookSignature(payload, signature, webhookSecret)

    if (!valid) {
      return errorResponse('Invalid Stripe signature', 400)
    }

    const event = JSON.parse(payload) as StripeEvent
    const object = event.data?.object

    if (event.type !== 'checkout.session.completed' && event.type !== 'payment_intent.succeeded') {
      return jsonResponse({ success: true, skipped: true, reason: `Ignored event ${event.type}` })
    }

    if (event.type === 'checkout.session.completed' && object?.payment_status === 'unpaid') {
      return jsonResponse({ success: true, skipped: true, reason: 'Checkout session unpaid' })
    }

    if (!event.id) {
      return errorResponse('Stripe event missing id', 400)
    }

    const paymentId = object?.metadata?.payment_id?.trim()
    const supabase = createServiceClient()

    let resolvedPaymentId = paymentId

    if (!resolvedPaymentId && object?.id) {
      const { data: bySession } = await supabase
        .from('payments')
        .select('id')
        .eq('stripe_payment_intent_id', object.id)
        .maybeSingle()

      resolvedPaymentId = bySession?.id

      if (!resolvedPaymentId) {
        const paymentIntentId =
          typeof object.payment_intent === 'string'
            ? object.payment_intent
            : object.payment_intent?.id

        if (paymentIntentId) {
          const { data: byIntent } = await supabase
            .from('payments')
            .select('id')
            .eq('stripe_payment_intent_id', paymentIntentId)
            .maybeSingle()
          resolvedPaymentId = byIntent?.id
        }
      }
    }

    if (!resolvedPaymentId) {
      return errorResponse('Could not resolve payment_id from Stripe event', 400)
    }

    const claimed = await claimGatewayWebhookEvent(supabase, {
      provider: 'stripe',
      eventKey: `stripe:${event.id}`,
      functionName: 'stripe-webhook',
      paymentId: resolvedPaymentId,
      metadata: { type: event.type },
    })

    if (!claimed) {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: 'Duplicate Stripe event',
        eventId: event.id,
      })
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, amount_usd, status')
      .eq('id', resolvedPaymentId)
      .single()

    if (paymentError || !payment) {
      return errorResponse('Payment not found for Stripe event', 404)
    }

    const paidCents =
      event.type === 'checkout.session.completed'
        ? object?.amount_total
        : object?.amount

    if (
      !stripeAmountMatches(paidCents, Number(payment.amount_usd), object?.currency ?? 'usd')
    ) {
      console.error('Stripe amount mismatch', {
        paymentId: resolvedPaymentId,
        expectedUsd: payment.amount_usd,
        paidCents,
        currency: object?.currency,
        eventId: event.id,
      })
      return errorResponse('Paid amount does not match recorded payment', 409)
    }

    const paymentIntentId =
      typeof object?.payment_intent === 'string'
        ? object.payment_intent
        : object?.payment_intent?.id ??
          (event.type === 'payment_intent.succeeded' ? object?.id : null)

    if (paymentIntentId) {
      await supabase
        .from('payments')
        .update({ stripe_payment_intent_id: paymentIntentId })
        .eq('id', resolvedPaymentId)
    }

    const result = await confirmPaymentAndIssueReceipt(supabase, resolvedPaymentId, {
      source: 'stripe_webhook',
      actorId: null,
      providerEventKey: `stripe:${event.id}`,
      paidAmount: paidCents != null ? paidCents / 100 : null,
      paidCurrency: (object?.currency ?? 'usd').toUpperCase(),
    })

    return jsonResponse({
      success: true,
      receiptNumber: result.receiptNumber,
      alreadyConfirmed: result.alreadyConfirmed,
    })
  } catch (error) {
    if (error instanceof ConfirmPaymentError) {
      return errorResponse(error.message, error.status)
    }

    const message = error instanceof Error ? error.message : 'Unexpected error'
    return errorResponse(message, 500)
  }
})
