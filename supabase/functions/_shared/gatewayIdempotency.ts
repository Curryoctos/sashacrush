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
    metadata?: Record<string, unknown> | null
  },
): Promise<boolean> {
  const { error } = await supabase.from('gateway_webhook_events').insert({
    provider: params.provider,
    event_key: params.eventKey,
    function_name: params.functionName,
    payment_id: params.paymentId ?? null,
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
