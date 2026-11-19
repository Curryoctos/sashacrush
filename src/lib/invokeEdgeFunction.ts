import { extractEdgeFunctionError } from '@/lib/edgeFunctionError'
import { supabase } from '@/lib/supabase'

/**
 * Invoke an Edge Function and surface the function’s `{ error }` body
 * (or a clear reachability message) instead of Supabase’s generic text.
 */
export async function invokeEdgeFunction<T extends Record<string, unknown>>(
  name: string,
  body: Record<string, unknown>,
  fallback: string,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })

  if (error || (data && typeof data === 'object' && 'error' in data && data.error)) {
    throw new Error(await extractEdgeFunctionError(error, data, fallback))
  }

  return (data ?? {}) as T
}
