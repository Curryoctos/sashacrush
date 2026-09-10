/// <reference path="../_shared/deno.d.ts" />
import {
  ConfirmInvestmentError,
  confirmInvestmentFromGateway,
} from '../_shared/confirmInvestment.ts'
import {
  ConfirmPaymentError,
  confirmPaymentAndIssueReceipt,
} from '../_shared/confirmPayment.ts'
import {
  claimGatewayWebhookEvent,
  releaseGatewayWebhookEvent,
} from '../_shared/gatewayIdempotency.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { stripeAmountMatches } from '../_shared/paymentAmountGuard.ts'
import {
  getStripeWebhookSecret,
  verifyStripeWebhookSignature,
} from '../_shared/stripe.ts'
import { createServiceClient } from '../_shared/supabaseAdmin.ts'

interface StripeEventObject {
  id?: string
  amount_total?: number
  amount?: number
  currency?: string
  metadata?: { payment_id?: string; investment_id?: string }
  payment_intent?: string | { id?: string } | null
  payment_status?: string
}

interface StripeEvent {
  id?: string
  type?: string
  data?: {
    object?: StripeEventObject
  }
}

type ServiceClient = ReturnType<typeof createServiceClient>

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

    const investmentId = object?.metadata?.investment_id?.trim()
    const paymentId = object?.metadata?.payment_id?.trim()
    const supabase = createServiceClient()

    if (investmentId) {
      return await handleInvestmentCheckout({
        supabase,
        eventId: event.id,
        eventType: event.type ?? '',
        object,
        investmentId,
      })
    }

    return await handleLegacyPaymentCheckout({
      supabase,
      eventId: event.id,
      eventType: event.type ?? '',
      object,
      paymentId,
    })
  } catch (error) {
    if (error instanceof ConfirmPaymentError || error instanceof ConfirmInvestmentError) {
      return errorResponse(error.message, error.status)
    }

    const message = error instanceof Error ? error.message : 'Unexpected error'
    return errorResponse(message, 500)
  }
})

async function handleInvestmentCheckout(params: {
  supabase: ServiceClient
  eventId: string
  eventType: string
  object: StripeEventObject | undefined
  investmentId: string
}) {
  const { supabase, eventId, eventType, object, investmentId } = params
  const eventKey = `stripe:investment:${eventId}`

  const claimed = await claimGatewayWebhookEvent(supabase, {
    provider: 'stripe',
    eventKey,
    functionName: 'stripe-webhook',
    investmentId,
    metadata: { type: eventType, kind: 'investment' },
  })

  if (!claimed) {
    return jsonResponse({
      success: true,
      skipped: true,
      reason: 'Duplicate Stripe investment event',
      eventId,
    })
  }

  try {
    const { data: investment, error: investmentError } = await supabase
      .from('investments')
      .select('id, amount_usd, status, method')
      .eq('id', investmentId)
      .single()

    if (investmentError || !investment) {
      await releaseGatewayWebhookEvent(supabase, { provider: 'stripe', eventKey })
      return errorResponse('Investment not found for Stripe event', 404)
    }

    if (investment.method !== 'stripe') {
      await releaseGatewayWebhookEvent(supabase, { provider: 'stripe', eventKey })
      return errorResponse('Investment method is not stripe', 409)
    }

    const paidCents =
      eventType === 'checkout.session.completed' ? object?.amount_total : object?.amount

    if (
      !stripeAmountMatches(paidCents, Number(investment.amount_usd), object?.currency ?? 'usd')
    ) {
      console.error('Stripe investment amount mismatch', {
        investmentId,
        expectedUsd: investment.amount_usd,
        paidCents,
        currency: object?.currency,
        eventId,
      })
      await releaseGatewayWebhookEvent(supabase, { provider: 'stripe', eventKey })
      return errorResponse('Paid amount does not match recorded investment', 409)
    }

    const paymentIntentId =
      typeof object?.payment_intent === 'string'
        ? object.payment_intent
        : object?.payment_intent?.id ??
          (eventType === 'payment_intent.succeeded' ? object?.id : null)

    const checkoutSessionId =
      eventType === 'checkout.session.completed' ? object?.id ?? null : null

    const result = await confirmInvestmentFromGateway(supabase, investmentId, {
      stripePaymentIntentId: paymentIntentId ?? null,
      stripeCheckoutSessionId: checkoutSessionId,
    })

    return jsonResponse({
      success: true,
      kind: 'investment',
      investmentId,
      alreadyConfirmed: result.alreadyConfirmed,
    })
  } catch (error) {
    await releaseGatewayWebhookEvent(supabase, { provider: 'stripe', eventKey })
    throw error
  }
}

async function handleLegacyPaymentCheckout(params: {
  supabase: ServiceClient
  eventId: string
  eventType: string
  object: StripeEventObject | undefined
  paymentId?: string
}) {
  const { supabase, eventId, eventType, object } = params
  let resolvedPaymentId = params.paymentId

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
    // May also be an investment PI without metadata on payment_intent.succeeded — try lookup.
    const paymentIntentId =
      typeof object?.payment_intent === 'string'
        ? object.payment_intent
        : object?.payment_intent?.id ??
          (eventType === 'payment_intent.succeeded' ? object?.id : null)

    if (paymentIntentId) {
      const { data: byInvestIntent } = await supabase
        .from('investments')
        .select('id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle()

      if (byInvestIntent?.id) {
        return await handleInvestmentCheckout({
          supabase,
          eventId,
          eventType,
          object,
          investmentId: byInvestIntent.id,
        })
      }
    }

    if (object?.id && eventType === 'checkout.session.completed') {
      const { data: byInvestSession } = await supabase
        .from('investments')
        .select('id')
        .eq('stripe_checkout_session_id', object.id)
        .maybeSingle()

      if (byInvestSession?.id) {
        return await handleInvestmentCheckout({
          supabase,
          eventId,
          eventType,
          object,
          investmentId: byInvestSession.id,
        })
      }
    }

    return errorResponse('Could not resolve payment_id or investment_id from Stripe event', 400)
  }

  const claimed = await claimGatewayWebhookEvent(supabase, {
    provider: 'stripe',
    eventKey: `stripe:${eventId}`,
    functionName: 'stripe-webhook',
    paymentId: resolvedPaymentId,
    metadata: { type: eventType, kind: 'payment' },
  })

  if (!claimed) {
    return jsonResponse({
      success: true,
      skipped: true,
      reason: 'Duplicate Stripe event',
      eventId,
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
    eventType === 'checkout.session.completed' ? object?.amount_total : object?.amount

  if (!stripeAmountMatches(paidCents, Number(payment.amount_usd), object?.currency ?? 'usd')) {
    console.error('Stripe amount mismatch', {
      paymentId: resolvedPaymentId,
      expectedUsd: payment.amount_usd,
      paidCents,
      currency: object?.currency,
      eventId,
    })
    return errorResponse('Paid amount does not match recorded payment', 409)
  }

  const paymentIntentId =
    typeof object?.payment_intent === 'string'
      ? object.payment_intent
      : object?.payment_intent?.id ??
        (eventType === 'payment_intent.succeeded' ? object?.id : null)

  if (paymentIntentId) {
    await supabase
      .from('payments')
      .update({ stripe_payment_intent_id: paymentIntentId })
      .eq('id', resolvedPaymentId)
  }

  const result = await confirmPaymentAndIssueReceipt(supabase, resolvedPaymentId, {
    source: 'stripe_webhook',
    actorId: null,
    providerEventKey: `stripe:${eventId}`,
    paidAmount: paidCents != null ? paidCents / 100 : null,
    paidCurrency: (object?.currency ?? 'usd').toUpperCase(),
  })

  return jsonResponse({
    success: true,
    kind: 'payment',
    receiptNumber: result.receiptNumber,
    alreadyConfirmed: result.alreadyConfirmed,
  })
}
