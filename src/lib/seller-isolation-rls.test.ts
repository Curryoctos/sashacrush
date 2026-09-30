// @vitest-environment node
/**
 * C-30 / BR-01: seller JWT must return zero rows from admin/staff-sensitive tables.
 *
 * Prerequisites: supabase start + db reset (CI does this).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/database'

const LOCAL_URL = 'http://127.0.0.1:54321'
const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const url = import.meta.env.VITE_SUPABASE_URL || LOCAL_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || LOCAL_ANON_KEY
const DEV_PASSWORD = 'changeme-local-only'
const MUBENDE_SELLER_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'

/** Tables sellers must never read (admin / capital / ops surfaces). */
const SELLER_DENIED_TABLES = [
  'payments',
  'investments',
  'transactions_crypto',
  'audit_log',
  'gateway_webhook_events',
  'media_videos',
  'cargo_shipments',
  'cargo_documents',
  'cargo_approvals',
  'suggestions',
] as const

function createAnonClient() {
  return createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function requireSupabase(): Promise<void> {
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(3000),
    })
    if (response.status >= 500) {
      throw new Error(`Supabase REST returned ${response.status}`)
    }
  } catch (error) {
    if (process.env.CI === 'true') {
      throw new Error(
        `Supabase must be running for integration tests in CI: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
    throw error
  }
}

async function signInSeller(client: SupabaseClient<Database>) {
  const { data, error } = await client.auth.signInWithPassword({
    email: 'seller@sashacrush.com',
    password: DEV_PASSWORD,
  })
  expect(error).toBeNull()
  expect(data.user?.id).toBe(MUBENDE_SELLER_ID)
}

describe('Seller isolation from admin tables (C-30 / BR-01)', () => {
  beforeAll(async () => {
    await requireSupabase()
  })

  it.each(SELLER_DENIED_TABLES)(
    'seller select on %s returns zero rows (or permission denied)',
    async (table) => {
      const client = createAnonClient()
      await signInSeller(client)

      const { data, error } = await client.from(table).select('*')

      if (error) {
        // RLS may surface as empty set OR a permission error depending on grants.
        expect(error.message.toLowerCase()).toMatch(/permission|policy|denied|rls/)
        expect(data).toBeNull()
      } else {
        expect(data).toEqual([])
      }

      await client.auth.signOut()
    },
  )

  it('seller cannot read other users staff profiles beyond self', async () => {
    const client = createAnonClient()
    await signInSeller(client)

    const { data, error } = await client.from('users').select('id, role, email')
    expect(error).toBeNull()
    expect(data?.every((row) => row.id === MUBENDE_SELLER_ID)).toBe(true)

    await client.auth.signOut()
  })
})
