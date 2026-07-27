import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/**
 * Generates the next sequential receipt number.
 * Format: SC-YYYY-NNNNNN (e.g. SC-2026-000001)
 *
 * Allocation is atomic inside Postgres: pg_advisory_xact_lock + COUNT
 * run in a single SECURITY DEFINER function so the lock is held for
 * the whole allocation (unlike separate PostgREST round-trips).
 */
export async function generateReceiptNumber(
  supabase: SupabaseClient,
): Promise<string> {
  const { data, error } = await supabase.rpc('allocate_receipt_number')

  if (error) {
    throw new Error(`Failed to allocate receipt number: ${error.message}`)
  }

  if (typeof data !== 'string' || !/^SC-\d{4}-\d{6}$/.test(data)) {
    throw new Error(`Invalid receipt number allocated: ${String(data)}`)
  }

  return data
}
