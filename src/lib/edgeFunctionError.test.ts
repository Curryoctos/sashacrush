import { FunctionsHttpError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { extractEdgeFunctionError } from '@/lib/edgeFunctionError'

describe('extractEdgeFunctionError', () => {
  it('prefers data.error when present', async () => {
    await expect(
      extractEdgeFunctionError(null, { error: 'from data' }, 'fallback'),
    ).resolves.toBe('from data')
  })

  it('reads JSON error from FunctionsHttpError Response context', async () => {
    const error = new FunctionsHttpError(
      new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY is not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(
      extractEdgeFunctionError(error, null, 'Could not start gateway checkout.'),
    ).resolves.toBe('STRIPE_SECRET_KEY is not configured')
  })

  it('falls back when response body is not JSON', async () => {
    const error = new FunctionsHttpError(new Response('oops', { status: 500 }))

    await expect(
      extractEdgeFunctionError(error, null, 'Could not start gateway checkout.'),
    ).resolves.toContain('Could not start gateway checkout.')
  })
})
