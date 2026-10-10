// @vitest-environment node
/**
 * BR-07: GPS columns on photos are immutable after insert.
 */
import { createClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const DEV_PASSWORD = 'changeme-local-only'
const MUBENDE_LAND_ID = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'

function createAnonClient() {
  return createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function requireSupabase() {
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
    headers: { apikey: anonKey },
    signal: AbortSignal.timeout(3000),
  })
  if (response.status >= 500) {
    throw new Error(`Supabase REST returned ${response.status}`)
  }
}

describe('Photo GPS immutability (BR-07)', () => {
  beforeAll(async () => {
    try {
      await requireSupabase()
    } catch (error) {
      if (process.env.CI === 'true') {
        throw error
      }
      console.warn('Skipping GPS immutability test: Supabase not reachable')
    }
  })

  it('admin cannot change latitude/longitude after upload', async () => {
    try {
      await requireSupabase()
    } catch {
      if (process.env.CI === 'true') throw new Error('Supabase required in CI')
      return
    }

    const client = createAnonClient()
    const { error: signInError } = await client.auth.signInWithPassword({
      email: 'admin@sashacrush.com',
      password: DEV_PASSWORD,
    })
    expect(signInError).toBeNull()

    const { data: existing, error: listError } = await client
      .from('photos')
      .select('id, latitude, longitude')
      .eq('land_id', MUBENDE_LAND_ID)
      .limit(1)
      .maybeSingle()

    expect(listError).toBeNull()
    if (!existing) {
      // Seed may omit photos; skip rather than invent storage objects.
      await client.auth.signOut()
      return
    }

    const { data, error } = await client
      .from('photos')
      .update({
        latitude: (existing.latitude ?? 0) + 0.01,
        longitude: (existing.longitude ?? 0) + 0.01,
      })
      .eq('id', existing.id)
      .select('id')

    expect(error).toBeTruthy()
    expect(error?.message ?? '').toMatch(/immutable|GPS|check_violation/i)
    expect(data ?? []).toEqual([])

    await client.auth.signOut()
  })
})
