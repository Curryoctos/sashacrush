import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface ConfirmInvestmentResult {
  alreadyConfirmed: boolean
}

export class ConfirmInvestmentError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ConfirmInvestmentError'
    this.status = status
  }
}

/**
 * Confirm an executive capital contribution after Stripe (or other gateway) success.
 * Does not issue a seller receipt.
 */
export async function confirmInvestmentFromGateway(
  supabase: SupabaseClient,
  investmentId: string,
  params?: {
    stripePaymentIntentId?: string | null
    stripeCheckoutSessionId?: string | null
  },
): Promise<ConfirmInvestmentResult> {
  const { data: investment, error: investmentError } = await supabase
    .from('investments')
    .select('id, status, method')
    .eq('id', investmentId)
    .single()

  if (investmentError || !investment) {
    throw new ConfirmInvestmentError('Investment not found', 404)
  }

  if (investment.status === 'confirmed') {
    return { alreadyConfirmed: true }
  }

  // Client cancel can race a successful Stripe charge. Paid webhook wins for stripe rows.
  const recoverableReject =
    investment.status === 'rejected' && investment.method === 'stripe'

  if (investment.status === 'rejected' && !recoverableReject) {
    throw new ConfirmInvestmentError(
      'This investment was rejected and cannot be confirmed.',
      400,
    )
  }

  if (investment.status !== 'pending' && !recoverableReject) {
    throw new ConfirmInvestmentError(`Investment is ${investment.status}`, 400)
  }

  const patch: Record<string, unknown> = {
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    rejection_reason: null,
  }

  if (params?.stripePaymentIntentId) {
    patch.stripe_payment_intent_id = params.stripePaymentIntentId
  }
  if (params?.stripeCheckoutSessionId) {
    patch.stripe_checkout_session_id = params.stripeCheckoutSessionId
  }

  let updatedQuery = supabase
    .from('investments')
    .update(patch)
    .eq('id', investmentId)

  updatedQuery = recoverableReject
    ? updatedQuery.eq('status', 'rejected').eq('method', 'stripe')
    : updatedQuery.eq('status', 'pending')

  const { data: updated, error: updateError } = await updatedQuery
    .select('id')
    .maybeSingle()

  if (updateError) {
    throw new ConfirmInvestmentError(updateError.message, 500)
  }

  if (!updated) {
    const { data: again } = await supabase
      .from('investments')
      .select('status')
      .eq('id', investmentId)
      .maybeSingle()

    if (again?.status === 'confirmed') {
      return { alreadyConfirmed: true }
    }

    throw new ConfirmInvestmentError('Could not confirm investment', 409)
  }

  return { alreadyConfirmed: false }
}
