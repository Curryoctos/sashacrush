import { describe, expect, it, vi } from 'vitest'
import {
  claimGatewayWebhookEvent,
  releaseGatewayWebhookEvent,
} from '../../../supabase/functions/_shared/gatewayIdempotency.ts'

describe('claimGatewayWebhookEvent', () => {
  it('returns true on first claim', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    }

    const claimed = await claimGatewayWebhookEvent(supabase as never, {
      provider: 'stripe',
      eventKey: 'stripe:evt_1',
      functionName: 'stripe-webhook',
      paymentId: 'pay-1',
    })

    expect(claimed).toBe(true)
  })

  it('returns false on duplicate event_key', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate' } }),
      }),
    }

    const claimed = await claimGatewayWebhookEvent(supabase as never, {
      provider: 'flutterwave',
      eventKey: 'flutterwave:tx:99',
      functionName: 'flutterwave-webhook',
    })

    expect(claimed).toBe(false)
  })
})

describe('releaseGatewayWebhookEvent', () => {
  it('deletes the claimed event by provider + key', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const del = vi.fn().mockReturnValue({ eq: eq1 })
    const supabase = {
      from: vi.fn().mockReturnValue({
        delete: del,
      }),
    }

    await releaseGatewayWebhookEvent(supabase as never, {
      provider: 'flutterwave',
      eventKey: 'flutterwave:transfer:42',
    })

    expect(supabase.from).toHaveBeenCalledWith('gateway_webhook_events')
    expect(del).toHaveBeenCalled()
    expect(eq1).toHaveBeenCalledWith('provider', 'flutterwave')
    expect(eq2).toHaveBeenCalledWith('event_key', 'flutterwave:transfer:42')
  })
})
