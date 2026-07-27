/// <reference path="../_shared/deno.d.ts" />
import {
  ConfirmPaymentError,
  confirmPaymentAndIssueReceipt,
} from '../_shared/confirmPayment.ts'
import {
  getFlutterwaveWebhookHash,
  verifyFlutterwaveTransaction,
  verifyFlutterwaveWebhookHash,
} from '../_shared/flutterwave.ts'
import { claimGatewayWebhookEvent } from '../_shared/gatewayIdempotency.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { flutterwaveAmountMatches } from '../_shared/paymentAmountGuard.ts'
import { createServiceClient } from '../_shared/supabaseAdmin.ts'

interface FlutterwaveWebhookPayload {
  event?: string
  data?: {
    id?: number
    tx_ref?: string
    status?: string
    amount?: number
    currency?: string
    meta?: { payment_id?: string }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const expectedHash = getFlutterwaveWebhookHash()
    if (!expectedHash) {
      return errorResponse('FLUTTERWAVE_WEBHOOK_HASH is not configured', 503)
    }

    const headerHash = req.headers.get('verif-hash')
    if (!verifyFlutterwaveWebhookHash(headerHash, expectedHash)) {
      return errorResponse('Invalid Flutterwave webhook hash', 401)
    }

    const payload = (await req.json()) as FlutterwaveWebhookPayload
    const webhookStatus = payload.data?.status?.toLowerCase()

    if (webhookStatus !== 'successful') {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: `Ignored Flutterwave status ${webhookStatus ?? 'unknown'}`,
      })
    }

    const transactionId = payload.data?.id
    if (transactionId == null) {
      return errorResponse('Flutterwave webhook missing transaction id', 400)
    }

    const verified = await verifyFlutterwaveTransaction(transactionId)

    if (verified.status !== 'successful') {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: `Verify API status ${verified.status}`,
      })
    }

    const txRef = verified.txRef.trim() || payload.data?.tx_ref?.trim() || ''
    const metaPaymentId =
      verified.metaPaymentId ?? payload.data?.meta?.payment_id?.trim() ?? null

    const supabase = createServiceClient()

    let paymentId = metaPaymentId

    if (!paymentId && txRef) {
      const { data: payment } = await supabase
        .from('payments')
        .select('id')
        .eq('flutterwave_tx_ref', txRef)
        .maybeSingle()
      paymentId = payment?.id ?? null
    }

    if (!paymentId) {
      return errorResponse('Could not resolve payment_id from Flutterwave event', 400)
    }

    const claimed = await claimGatewayWebhookEvent(supabase, {
      provider: 'flutterwave',
      eventKey: `flutterwave:tx:${transactionId}`,
      functionName: 'flutterwave-webhook',
      paymentId,
      metadata: { tx_ref: txRef },
    })

    if (!claimed) {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: 'Duplicate Flutterwave transaction',
        transactionId,
      })
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, amount_usd, amount_ugx, flutterwave_tx_ref, status')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return errorResponse('Payment not found for Flutterwave event', 404)
    }

    if (
      payment.flutterwave_tx_ref &&
      txRef &&
      payment.flutterwave_tx_ref !== txRef
    ) {
      return errorResponse('Flutterwave tx_ref does not match payment record', 409)
    }

    if (
      !flutterwaveAmountMatches({
        paidAmount: verified.amount,
        paidCurrency: verified.currency,
        expectedUsd: Number(payment.amount_usd),
        expectedUgx: payment.amount_ugx != null ? Number(payment.amount_ugx) : null,
      })
    ) {
      console.error('Flutterwave amount mismatch', {
        paymentId,
        expectedUsd: payment.amount_usd,
        expectedUgx: payment.amount_ugx,
        paidAmount: verified.amount,
        paidCurrency: verified.currency,
        transactionId,
      })
      return errorResponse('Paid amount does not match recorded payment', 409)
    }

    if (txRef && !payment.flutterwave_tx_ref) {
      await supabase
        .from('payments')
        .update({ flutterwave_tx_ref: txRef })
        .eq('id', paymentId)
    }

    const result = await confirmPaymentAndIssueReceipt(supabase, paymentId, {
      source: 'flutterwave_webhook',
      actorId: null,
      providerEventKey: `flutterwave:tx:${transactionId}`,
      paidAmount: verified.amount,
      paidCurrency: verified.currency,
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
