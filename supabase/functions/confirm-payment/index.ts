/// <reference path="../_shared/deno.d.ts" />
import { requireAuthenticatedStaff } from '../_shared/auth.ts'
import {
  ConfirmPaymentError,
  confirmPaymentAndIssueReceipt,
} from '../_shared/confirmPayment.ts'
import { errorResponse, jsonResponse } from '../_shared/http.ts'
import { assertRateLimit, RateLimitError } from '../_shared/rateLimit.ts'
import { createServiceClient } from '../_shared/supabaseAdmin.ts'

interface ConfirmPaymentPayload {
  paymentId?: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const staff = await requireAuthenticatedStaff(req)
    const supabase = createServiceClient()

    try {
      await assertRateLimit(supabase, `confirm-payment:${staff.userId}`, 30, 3_600)
    } catch (error) {
      if (error instanceof RateLimitError) {
        return errorResponse(error.message, 429)
      }
      throw error
    }

    const payload = (await req.json()) as ConfirmPaymentPayload
    const paymentId = payload.paymentId?.trim()

    if (!paymentId) {
      return errorResponse('paymentId is required', 400)
    }

    const result = await confirmPaymentAndIssueReceipt(supabase, paymentId, {
      source: 'staff',
      actorId: staff.userId,
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
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return errorResponse(message, status)
  }
})
