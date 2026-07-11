import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export class RateLimitError extends Error {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message)
    this.name = 'RateLimitError'
  }
}

export async function assertRateLimit(
  supabase: SupabaseClient,
  rateKey: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<void> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString()

  const { count, error: countError } = await supabase
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('rate_key', rateKey)
    .gte('created_at', windowStart)

  if (countError) {
    throw new Error(`Rate limit check failed: ${countError.message}`)
  }

  if ((count ?? 0) >= maxAttempts) {
    throw new RateLimitError()
  }

  const { error: insertError } = await supabase
    .from('rate_limit_events')
    .insert({ rate_key: rateKey })

  if (insertError) {
    throw new Error(`Rate limit record failed: ${insertError.message}`)
  }
}
