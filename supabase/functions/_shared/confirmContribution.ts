import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface ConfirmContributionResult {
  alreadyConfirmed: boolean
}

export class ConfirmContributionError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ConfirmContributionError'
    this.status = status
  }
}

/**
 * Confirm a public project contribution after Stripe Checkout success.
 * funding_raised_usd is updated by DB trigger.
 */
export async function confirmContributionFromGateway(
  supabase: SupabaseClient,
  contributionId: string,
  params?: {
    stripePaymentIntentId?: string | null
    stripeCheckoutSessionId?: string | null
  },
): Promise<ConfirmContributionResult> {
  const { data: contribution, error } = await supabase
    .from('project_contributions')
    .select('id, status, method')
    .eq('id', contributionId)
    .single()

  if (error || !contribution) {
    throw new ConfirmContributionError('Contribution not found', 404)
  }

  if (contribution.status === 'confirmed') {
    return { alreadyConfirmed: true }
  }

  if (contribution.status !== 'pending') {
    throw new ConfirmContributionError(`Contribution is ${contribution.status}`, 400)
  }

  if (contribution.method !== 'stripe') {
    throw new ConfirmContributionError('Only Stripe contributions confirm via webhook', 409)
  }

  const patch: Record<string, unknown> = {
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    rejection_reason: null,
  }

  if (params?.stripePaymentIntentId) {
    patch.stripe_payment_intent_id = params.stripePaymentIntentId
  }
  if (params?.stripeCheckoutSessionId) {
    patch.stripe_checkout_session_id = params.stripeCheckoutSessionId
  }

  const { data: updated, error: updateError } = await supabase
    .from('project_contributions')
    .update(patch)
    .eq('id', contributionId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (updateError) {
    throw new ConfirmContributionError(updateError.message, 500)
  }

  if (!updated) {
    const { data: again } = await supabase
      .from('project_contributions')
      .select('status')
      .eq('id', contributionId)
      .maybeSingle()

    if (again?.status === 'confirmed') {
      return { alreadyConfirmed: true }
    }

    throw new ConfirmContributionError('Could not confirm contribution', 409)
  }

  return { alreadyConfirmed: false }
}
