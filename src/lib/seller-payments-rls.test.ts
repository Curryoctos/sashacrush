// @vitest-environment node
/**
 * Integration test: seller RLS must block all access to the payments table.
 *
 * Prerequisites:
 *   npx supabase start
 *   npx supabase db reset
 *   .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 */
import { createClient } from '@supabase/supabase-js'
import { afterAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const LOCAL_URL = 'http://127.0.0.1:54321'
const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const url = supabaseUrl || LOCAL_URL
const anonKey = supabaseAnonKey || LOCAL_ANON_KEY
const DEV_PASSWORD = 'changeme-local-only'

function createAnonClient() {
  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

describe('Seller payments RLS (integration)', () => {
  const client = createAnonClient()

  afterAll(async () => {
    await client.auth.signOut()
  })

  it('admin can read payments (proves seed data exists)', async () => {
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
    const { error: signInError } = await client.auth.signInWithPassword({
      email: 'seller@sashacrush.com',
      password: DEV_PASSWORD,
    })
    expect(signInError).toBeNull()

    const { data: profile } = await client
      .from('users')
      .select('role')
      .eq('id', (await client.auth.getUser()).data.user!.id)
      .single()
    expect(profile?.role).toBe('seller')

    const { data, error } = await client.from('payments').select('*')

    expect(error).toBeNull()
    expect(data).toEqual([])

    await client.auth.signOut()
  })
})
