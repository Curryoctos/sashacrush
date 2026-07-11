import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { getEnv, requireEnv } from './env.ts'

export type StaffRole = 'admin' | 'agent'
export type UserRole = StaffRole | 'executive' | 'seller'

export interface AuthenticatedUser {
  userId: string
  role: UserRole
  client: SupabaseClient
}

export interface AuthenticatedStaff {
  userId: string
  role: StaffRole
  client: SupabaseClient
}

function bearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  return authHeader.slice(7)
}

/** Webhook handlers: require service role bearer (Supabase DB webhooks). */
export function requireServiceRole(req: Request): void {
  const token = bearerToken(req)
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

  if (!token || !serviceKey || token !== serviceKey) {
    throw new Error('Unauthorized')
  }
}

async function authenticateRequest(req: Request): Promise<AuthenticatedUser> {
  const token = bearerToken(req)
  if (!token) {
    throw new Error('Unauthorized')
  }

  const supabaseUrl = requireEnv('SUPABASE_URL', getEnv('SUPABASE_URL'))
  const anonKey = requireEnv('SUPABASE_ANON_KEY', getEnv('SUPABASE_ANON_KEY'))

  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(token)

  if (userError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: profile, error: profileError } = await client
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.role) {
    throw new Error('Forbidden')
  }

  return {
    userId: user.id,
    role: profile.role as UserRole,
    client,
  }
}

/** Any authenticated portal user. */
export async function requireAuthenticatedUser(req: Request): Promise<AuthenticatedUser> {
  return authenticateRequest(req)
}

/** Client-invoked functions: verify JWT and admin/agent role. */
export async function requireAuthenticatedStaff(req: Request): Promise<AuthenticatedStaff> {
  const user = await authenticateRequest(req)

  if (user.role !== 'admin' && user.role !== 'agent') {
    throw new Error('Forbidden')
  }

  return {
    userId: user.userId,
    role: user.role,
    client: user.client,
  }
}
