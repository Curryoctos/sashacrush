import { createClient } from 'npm:@supabase/supabase-js@2'
import { getEnv, requireEnv } from './env.ts'

export function createServiceClient() {
  const supabaseUrl = requireEnv('SUPABASE_URL', getEnv('SUPABASE_URL'))
  const serviceRoleKey = requireEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
    getEnv('SUPABASE_SERVICE_ROLE_KEY'),
  )

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function getAppUrl(): string {
  return getEnv('APP_URL') ?? getEnv('VITE_APP_URL') ?? 'http://localhost:5173'
}
