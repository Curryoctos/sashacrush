import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/**
 * Claim a gateway webhook event for idempotent processing.
 * Returns false if this event_key was already processed.
 */
export async function claimGatewayWebhookEvent(
  supabase: SupabaseClient,
  params: {
    provider: 'stripe' | 'flutterwave'
    eventKey: string
    functionName: string
    paymentId?: string | null
    investmentId?: string | null
    metadata?: Record<string, unknown> | null
  },
): Promise<boolean> {
  const { error } = await supabase.from('gateway_webhook_events').insert({
    provider: params.provider,
    event_key: params.eventKey,
    function_name: params.functionName,
    payment_id: params.paymentId ?? null,
    investment_id: params.investmentId ?? null,
    metadata: params.metadata ?? null,
  })

  if (error?.code === '23505') {
    console.log('Skipping duplicate gateway webhook:', params.eventKey)
    return false
  }

  if (error) {
    throw new Error(`Gateway webhook idempotency check failed: ${error.message}`)
  }

  return true
}

/**
 * Release a previously claimed webhook event so Flutterwave can safely retry
 * after a transient processing failure (amount mismatch, confirm error, etc.).
 */
export async function releaseGatewayWebhookEvent(
  supabase: SupabaseClient,
  params: {
    provider: 'stripe' | 'flutterwave'
    eventKey: string
  },
): Promise<void> {
  const { error } = await supabase
    .from('gateway_webhook_events')
    .delete()
    .eq('provider', params.provider)
    .eq('event_key', params.eventKey)

  if (error) {
    console.error('Failed to release gateway webhook claim:', params.eventKey, error.message)
  }
}
