// @vitest-environment node
/**
 * Seller RLS: cannot read another seller's land record even when filtering by land ID.
 */
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const DEV_PASSWORD = 'changeme-local-only'
const MUBENDE_LAND_ID = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'
const MUBENDE_SELLER_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'

function createClientInstance() {
  return createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

let supabaseAvailable = false

describe('Seller land_records RLS (integration)', () => {
  const client = createClientInstance()

  beforeAll(async () => {
    try {
      const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
        headers: { apikey: anonKey },
        signal: AbortSignal.timeout(3000),
      })
      supabaseAvailable = response.status < 500
    } catch {
      supabaseAvailable = false
    }
  })

  afterAll(async () => {
    await client.auth.signOut()
  })

  it('assigned seller sees their own Mubende land record', async () => {
    if (!supabaseAvailable) {
      console.warn('Skipping integration test: Supabase not reachable')
      return
    }

    await client.auth.signInWithPassword({
      email: 'seller@sashacrush.com',
      password: DEV_PASSWORD,
    })

    const { data, error } = await client
      .from('land_records')
      .select('id, title, seller_id')
      .eq('seller_id', MUBENDE_SELLER_ID)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data?.[0]?.title).toBe('Mubende Land')

    await client.auth.signOut()
  })

  it('seller cannot read Mubende land by spoofing another seller_id in the query', async () => {
    if (!supabaseAvailable) {
      console.warn('Skipping integration test: Supabase not reachable')
      return
    }

    await client.auth.signInWithPassword({
      email: 'seller@sashacrush.com',
      password: DEV_PASSWORD,
    })

    const adminSellerSpoof = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    const { data, error } = await client
      .from('land_records')
      .select('*')
      .eq('seller_id', adminSellerSpoof)

    expect(error).toBeNull()
    expect(data).toEqual([])

    await client.auth.signOut()
  })

  it('unassigned seller cannot fetch Mubende land by land ID (network tampering scenario)', async () => {
    if (!supabaseAvailable) {
      console.warn('Skipping integration test: Supabase not reachable')
      return
    }

    await client.auth.signInWithPassword({
      email: 'seller2@sashacrush.com',
      password: DEV_PASSWORD,
    })

    const { data, error } = await client
      .from('land_records')
      .select('*')
      .eq('id', MUBENDE_LAND_ID)

    expect(error).toBeNull()
    expect(data).toEqual([])

    await client.auth.signOut()
  })
})
