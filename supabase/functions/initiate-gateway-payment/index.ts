/// <reference path="../_shared/deno.d.ts" />
import { requireAuthenticatedStaff } from '../_shared/auth.ts'
import {
  buildFlutterwavePayoutReference,
  createFlutterwaveMobileMoneyTransfer,
  getFlutterwaveSecretKey,
  getFlutterwaveTransferByReference,
  isFailedTransferStatus,
  isSuccessfulTransferStatus,
} from '../_shared/flutterwave.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { assertRateLimit, RateLimitError } from '../_shared/rateLimit.ts'
import { createServiceClient } from '../_shared/supabaseAdmin.ts'

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
        'id, land_id, amount_usd, amount_ugx, method, status, flutterwave_tx_ref, mobile_money_network, payer_phone',
      )
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return errorResponse('Payment not found', 404)
    }

    if (payment.status === 'confirmed') {
      return errorResponse('Payment is already confirmed', 400)
    }

    if (payment.status === 'failed') {
      return errorResponse(
        'This payout already failed. Create a new payout to try again.',
        400,
      )
    }

    if (payment.method === 'stripe') {
      return errorResponse(
        'Card payouts are not enabled. Use MTN/Airtel MoMo or manual transfer to pay the seller.',
        400,
      )
    }

    if (payment.method !== 'flutterwave') {
      return errorResponse('Payment method must be flutterwave for gateway payouts', 400)
    }

    if (!getFlutterwaveSecretKey()) {
      return errorResponse(
        'FLUTTERWAVE_SECRET_KEY is not configured. Set it in Supabase Edge Function secrets.',
        503,
      )
    }

    if (payment.amount_ugx == null || Number(payment.amount_ugx) <= 0) {
      return errorResponse('UGX amount is required for mobile-money payouts', 400)
    }

    if (!payment.payer_phone?.trim()) {
      return errorResponse('Seller mobile-money phone is required for payouts', 400)
    }

    const { data: land, error: landError } = await supabase
      .from('land_records')
      .select('title, seller_id')
      .eq('id', payment.land_id)
      .single()

    if (landError || !land) {
      return errorResponse('Land record not found', 404)
    }

    if (!land.seller_id) {
      return errorResponse('Assign a seller to this land before paying out', 400)
    }

    const { data: seller } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', land.seller_id)
      .single()

    const reference =
      payment.flutterwave_tx_ref?.trim() || buildFlutterwavePayoutReference(payment.id)

    // Idempotent path: reference already reserved — reuse existing FW transfer if any.
    if (payment.flutterwave_tx_ref) {
      const existing = await getFlutterwaveTransferByReference(payment.flutterwave_tx_ref)
      if (existing) {
        if (isFailedTransferStatus(existing.status)) {
          await supabase
            .from('payments')
            .update({ status: 'failed' })
            .eq('id', payment.id)
            .eq('status', 'pending')
          return errorResponse(
            'Flutterwave marked this payout as failed. Create a new payout to retry.',
            409,
          )
        }

        return jsonResponse({
          success: true,
          provider: 'flutterwave',
          mode: 'payout',
          reused: true,
          transferId: existing.transferId,
          reference: existing.reference,
          status: existing.status,
        })
      }
      // Claimed locally but no FW transfer yet (prior create failed) — recreate with same ref.
    } else {
      // Claim the deterministic reference before calling Flutterwave to prevent double payout.
      const { data: claimed, error: claimError } = await supabase
        .from('payments')
        .update({
          flutterwave_tx_ref: reference,
          gateway_checkout_url: null,
        })
        .eq('id', payment.id)
        .is('flutterwave_tx_ref', null)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle()

      if (claimError) {
        return errorResponse(`Could not reserve payout reference: ${claimError.message}`)
      }

      if (!claimed) {
        const { data: current } = await supabase
          .from('payments')
          .select('status, flutterwave_tx_ref')
          .eq('id', payment.id)
          .single()

        if (current?.flutterwave_tx_ref) {
          return jsonResponse({
            success: true,
            provider: 'flutterwave',
            mode: 'payout',
            reused: true,
            reference: current.flutterwave_tx_ref,
            status: 'queued',
          })
        }

        if (current?.status === 'confirmed') {
          return errorResponse('Payment is already confirmed', 400)
        }

        return errorResponse('Could not claim payout for initiation', 409)
      }
    }

    try {
      const transfer = await createFlutterwaveMobileMoneyTransfer({
        amountUgx: Number(payment.amount_ugx),
        paymentId: payment.id,
        landTitle: land.title,
        recipientPhone: payment.payer_phone,
        recipientName: seller?.full_name ?? seller?.email ?? null,
        mobileMoneyNetwork: payment.mobile_money_network,
        reference,
      })

      if (isSuccessfulTransferStatus(transfer.status)) {
        // Rare: FW may report SUCCESSFUL immediately; webhook still confirms + receipts.
      }

      return jsonResponse({
        success: true,
        provider: 'flutterwave',
        mode: 'payout',
        reused: Boolean(payment.flutterwave_tx_ref),
        transferId: transfer.transferId,
        reference: transfer.reference,
        status: transfer.status,
      })
    } catch (transferError) {
      const message =
        transferError instanceof Error
          ? transferError.message
          : 'Flutterwave transfer creation failed'

      // Only release the claim when FW clearly rejected before creating a transfer.
      // Ambiguous/network errors keep the claim so a retry reuses the same reference.
      if (isSafeToReleasePayoutClaim(message) && !payment.flutterwave_tx_ref) {
        await supabase
          .from('payments')
          .update({ flutterwave_tx_ref: null })
          .eq('id', payment.id)
          .eq('flutterwave_tx_ref', reference)
          .eq('status', 'pending')
      }

      throw transferError instanceof Error ? transferError : new Error(message)
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      return errorResponse(error.message, 429)
    }
    const message = error instanceof Error ? error.message : 'Unexpected error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return errorResponse(message, status)
  }
})

function isSafeToReleasePayoutClaim(message: string): boolean {
  if (/already exists|duplicate/i.test(message)) {
    return false
  }
  return /insufficient|invalid|validation|beneficiary|account number|currency|phone/i.test(
    message,
  )
}
