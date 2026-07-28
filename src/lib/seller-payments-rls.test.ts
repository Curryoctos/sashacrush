// @vitest-environment node
/**
 * Integration test: seller RLS must block all access to the payments table.
 *
 * Prerequisites:
 *   npx supabase start
 *   npx supabase db reset
 */
import { createClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/database'

const LOCAL_URL = 'http://127.0.0.1:54321'
const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const url = import.meta.env.VITE_SUPABASE_URL || LOCAL_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || LOCAL_ANON_KEY
const DEV_PASSWORD = 'changeme-local-only'
const MUBENDE_SELLER_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'

let supabaseAvailable = false

function createAnonClient() {
  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

describe('Seller payments RLS (integration)', () => {
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

  it('admin can read payments (proves seed data exists)', async () => {
    if (!supabaseAvailable) {
      console.warn('Skipping integration test: Supabase not reachable')
      return
    }

    const client = createAnonClient()
    const { error: signInError } = await client.auth.signInWithPassword({
      email: 'admin@sashacrush.com',
      password: DEV_PASSWORD,
    })
    expect(signInError).toBeNull()

    const { data, error } = await client.from('payments').select('id, amount_usd')
    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThan(0)

    await client.auth.signOut()
  })

  it('seller authenticated session returns ZERO rows from payments — not data', async () => {
    if (!supabaseAvailable) {
      console.warn('Skipping integration test: Supabase not reachable')
      return
    }

    // Fresh client per test avoids session races after admin signOut on a shared client.
    const client = createAnonClient()
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: 'seller@sashacrush.com',
      password: DEV_PASSWORD,
    })
    expect(signInError).toBeNull()
    expect(signInData.user?.id).toBe(MUBENDE_SELLER_ID)

    const { data: profile } = await client
      .from('users')
      .select('role')
      .eq('id', MUBENDE_SELLER_ID)
      .single()
    expect(profile?.role).toBe('seller')

    const { data, error } = await client.from('payments').select('*')

    expect(error).toBeNull()
    expect(data).toEqual([])

    await client.auth.signOut()
  })
})
