/// <reference path="../_shared/deno.d.ts" />
import {
  ConfirmPaymentError,
  confirmPaymentAndIssueReceipt,
} from '../_shared/confirmPayment.ts'
import {
  getFlutterwaveWebhookHash,
  isFailedTransferStatus,
  isSuccessfulTransferStatus,
  verifyFlutterwaveTransfer,
  verifyFlutterwaveWebhookHash,
} from '../_shared/flutterwave.ts'
import {
  claimGatewayWebhookEvent,
  releaseGatewayWebhookEvent,
} from '../_shared/gatewayIdempotency.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { flutterwaveAmountMatches } from '../_shared/paymentAmountGuard.ts'
import { createServiceClient } from '../_shared/supabaseAdmin.ts'

interface FlutterwaveWebhookPayload {
  event?: string
  'event.type'?: string
  data?: {
    id?: number
    reference?: string
    tx_ref?: string
    status?: string
    amount?: number
    currency?: string
    meta?: unknown
  }
}

function extractMetaPaymentId(meta: unknown): string | null {
  if (Array.isArray(meta)) {
    for (const entry of meta) {
      if (entry && typeof entry === 'object' && 'payment_id' in entry) {
        const value = (entry as { payment_id?: unknown }).payment_id
        if (typeof value === 'string' && value.trim()) {
          return value.trim()
        }
      }
    }
    return null
  }

  if (meta && typeof meta === 'object' && 'payment_id' in meta) {
    const value = (meta as { payment_id?: unknown }).payment_id
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  return null
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
    const eventName = (payload.event ?? payload['event.type'] ?? '').toLowerCase()

    // Payout webhooks: transfer.completed / Transfer. Collect-in charge events are ignored.
    const looksLikeTransfer =
      eventName.includes('transfer') ||
      Boolean(payload.data?.reference && !payload.data?.tx_ref)

    if (!looksLikeTransfer) {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: `Ignored non-transfer Flutterwave event ${eventName || 'unknown'}`,
      })
    }

    const transferId = payload.data?.id
    if (transferId == null) {
      return errorResponse('Flutterwave webhook missing transfer id', 400)
    }

    // Authoritative status comes from verify API, not the webhook body alone.
    const verified = await verifyFlutterwaveTransfer(transferId)

    if (
      !isSuccessfulTransferStatus(verified.status) &&
      !isFailedTransferStatus(verified.status)
    ) {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: `Transfer still in flight (${verified.status})`,
      })
    }

    const reference =
      verified.reference.trim() ||
      payload.data?.reference?.trim() ||
      payload.data?.tx_ref?.trim() ||
      ''
    const metaPaymentId =
      verified.metaPaymentId ?? extractMetaPaymentId(payload.data?.meta)

    const supabase = createServiceClient()

    let paymentId = metaPaymentId

    if (!paymentId && reference) {
      const { data: payment } = await supabase
        .from('payments')
        .select('id')
        .eq('flutterwave_tx_ref', reference)
        .maybeSingle()
      paymentId = payment?.id ?? null
    }

    if (!paymentId) {
      return errorResponse('Could not resolve payment_id from Flutterwave transfer', 400)
    }

    const eventKey = `flutterwave:transfer:${transferId}`
    const claimed = await claimGatewayWebhookEvent(supabase, {
      provider: 'flutterwave',
      eventKey,
      functionName: 'flutterwave-webhook',
      paymentId,
      metadata: { reference, status: verified.status },
    })

    if (!claimed) {
      return jsonResponse({
        success: true,
        skipped: true,
        reason: 'Duplicate Flutterwave transfer',
        transferId,
      })
    }

    try {
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('id, amount_usd, amount_ugx, flutterwave_tx_ref, status')
        .eq('id', paymentId)
        .single()

      if (paymentError || !payment) {
        await releaseGatewayWebhookEvent(supabase, {
          provider: 'flutterwave',
          eventKey,
        })
        return errorResponse('Payment not found for Flutterwave transfer', 404)
      }

      if (payment.status === 'confirmed') {
        return jsonResponse({
          success: true,
          skipped: true,
          reason: 'Payment already confirmed',
          transferId,
        })
      }

      if (payment.status === 'failed') {
        return jsonResponse({
          success: true,
          skipped: true,
          reason: 'Payment already marked failed',
          transferId,
        })
      }

      if (
        payment.flutterwave_tx_ref &&
        reference &&
        payment.flutterwave_tx_ref !== reference
      ) {
        await releaseGatewayWebhookEvent(supabase, {
          provider: 'flutterwave',
          eventKey,
        })
        return errorResponse('Flutterwave reference does not match payment record', 409)
      }

      if (isFailedTransferStatus(verified.status)) {
        const { error: failError } = await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('id', paymentId)
          .eq('status', 'pending')

        if (failError) {
          await releaseGatewayWebhookEvent(supabase, {
            provider: 'flutterwave',
            eventKey,
          })
          return errorResponse(`Could not mark payout failed: ${failError.message}`)
        }

        console.error('Flutterwave payout failed', {
          paymentId,
          transferId,
          reference,
          status: verified.status,
        })

        return jsonResponse({
          success: true,
          failed: true,
          paymentId,
          transferId,
          status: verified.status,
        })
      }

      if (
        !flutterwaveAmountMatches({
          paidAmount: verified.amount,
          paidCurrency: verified.currency,
          expectedUsd: Number(payment.amount_usd),
          expectedUgx: payment.amount_ugx != null ? Number(payment.amount_ugx) : null,
        })
      ) {
        console.error('Flutterwave payout amount mismatch', {
          paymentId,
          expectedUsd: payment.amount_usd,
          expectedUgx: payment.amount_ugx,
          paidAmount: verified.amount,
          paidCurrency: verified.currency,
          transferId,
        })
        await releaseGatewayWebhookEvent(supabase, {
          provider: 'flutterwave',
          eventKey,
        })
        return errorResponse('Payout amount does not match recorded payment', 409)
      }

      if (reference && !payment.flutterwave_tx_ref) {
        await supabase
          .from('payments')
          .update({ flutterwave_tx_ref: reference })
          .eq('id', paymentId)
      }

      const result = await confirmPaymentAndIssueReceipt(supabase, paymentId, {
        source: 'flutterwave_webhook',
        actorId: null,
        providerEventKey: eventKey,
        paidAmount: verified.amount,
        paidCurrency: verified.currency,
      })

      return jsonResponse({
        success: true,
        receiptNumber: result.receiptNumber,
        alreadyConfirmed: result.alreadyConfirmed,
      })
    } catch (processingError) {
      await releaseGatewayWebhookEvent(supabase, {
        provider: 'flutterwave',
        eventKey,
      })
      throw processingError
    }
  } catch (error) {
    if (error instanceof ConfirmPaymentError) {
      return errorResponse(error.message, error.status)
    }

    const message = error instanceof Error ? error.message : 'Unexpected error'
    return errorResponse(message, 500)
  }
})
