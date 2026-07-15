import { supabase } from '@/lib/supabase'

export async function fetchAdminUserId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data.id
}
