import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export async function claimNotificationEvent(
  supabase: SupabaseClient,
  eventKey: string,
  functionName: string,
): Promise<boolean> {
  const { error } = await supabase.from('notification_events').insert({
    event_key: eventKey,
    function_name: functionName,
  })

  if (error?.code === '23505') {
    console.log('Skipping duplicate notification:', eventKey)
    return false
  }

  if (error) {
    throw new Error(`Idempotency check failed: ${error.message}`)
  }

  return true
}
