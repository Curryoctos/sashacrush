import { describe, expect, it, vi } from 'vitest'
import { claimGatewayWebhookEvent } from '../../../supabase/functions/_shared/gatewayIdempotency.ts'

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
