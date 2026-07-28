import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type ConfirmAuditSource = 'staff' | 'stripe_webhook' | 'flutterwave_webhook'

export interface ConfirmAuditContext {
  source: ConfirmAuditSource
  actorId?: string | null
  providerEventKey?: string | null
  paidAmount?: number | null
  paidCurrency?: string | null
  receiptNumber?: string | null
}

/**
 * Write an enriched payment-confirm audit row with an explicit actor.
 * Safe to call after confirm; failures are logged and do not throw.
 */
export async function writePaymentConfirmAudit(
  supabase: SupabaseClient,
  paymentId: string,
  context: ConfirmAuditContext,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('write_audit_log_as', {
      p_actor_id: context.actorId ?? null,
      p_action: 'payment_confirmed',
      p_entity_type: 'payment',
      p_entity_id: paymentId,
      p_metadata: {
        source: context.source,
        provider_event_key: context.providerEventKey ?? null,
        paid_amount: context.paidAmount ?? null,
        paid_currency: context.paidCurrency ?? null,
        receipt_number: context.receiptNumber ?? null,
      },
    })

    if (error) {
      console.error('write_audit_log_as failed (non-fatal):', error.message)
    }
  } catch (err) {
    console.error('writePaymentConfirmAudit failed (non-fatal):', err)
  }
}
