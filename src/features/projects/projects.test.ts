/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import {
  anonymousDisplayName,
  contributionGoalPercent,
  validateContributeAmount,
} from '@/features/projects/contributeHelpers'
import {
  landAcquisitionSlug,
  landPurchasesPath,
  landWorkspacePath,
  projectPurchasesPath,
} from '@/features/projects/projectLandLink'
import {
  assertProjectType,
  canTransitionProjectStatus,
  fundingPercentage,
  slugifyProjectTitle,
} from '@/features/projects/projectUtils'
import { createClient } from '@supabase/supabase-js'

const LOCAL_URL = 'http://127.0.0.1:54321'
const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const LOCAL_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

/** Prefer classic local JWT keys; ignore sb_publishable_/sb_secret_ styles for REST RLS tests. */
function resolveKey(
  candidate: string | undefined,
  fallback: string,
): string {
  if (!candidate || candidate.startsWith('sb_')) {
    return fallback
  }
  return candidate
}

const SUPABASE_URL = resolveKey(
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
    process.env.VITE_SUPABASE_URL,
  LOCAL_URL,
)
const ANON_KEY = resolveKey(
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
    process.env.VITE_SUPABASE_ANON_KEY,
  LOCAL_ANON_KEY,
)
const SERVICE_KEY = resolveKey(
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  LOCAL_SERVICE_KEY,
)

async function supabaseReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: ANON_KEY },
      signal: AbortSignal.timeout(2000),
    })
    return res.ok || res.status === 200 || res.status === 404
  } catch {
    return false
  }
}

describe('project validation & lifecycle', () => {
  it('rejects an invalid project type string', () => {
    expect(() => assertProjectType('spaceship')).toThrow(/Invalid project type/)
    expect(assertProjectType('education')).toBe('education')
  })

  it('enforces status lifecycle transitions', () => {
    expect(canTransitionProjectStatus('draft', 'active')).toBe(true)
    expect(canTransitionProjectStatus('active', 'funded')).toBe(true)
    expect(canTransitionProjectStatus('completed', 'active')).toBe(false)
    expect(canTransitionProjectStatus('completed', 'draft')).toBe(false)
  })

  it('slugifies titles to lowercase hyphenated form', () => {
    expect(slugifyProjectTitle("St. Peter's School — Kampala 2026")).toBe(
      'st-peters-school-kampala-2026',
    )
  })

  it('computes funding percentage', () => {
    expect(fundingPercentage(50000, 300000)).toBe(16.67)
    expect(fundingPercentage(0, 300000)).toBe(0)
    expect(fundingPercentage(300000, 300000)).toBe(100)
  })

  it('builds stable land↔project deep links', () => {
    const landId = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'
    const projectId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    expect(landAcquisitionSlug(landId)).toBe(
      'land-e4eebc999c0b4ef8bb6d6bb9bd380a55',
    )
    expect(landWorkspacePath('/admin', landId, 'payments')).toBe(
      `/admin/land-records?land=${landId}&folder=payments`,
    )
    expect(landPurchasesPath(landId, 'collect')).toBe(
      `/admin/payments?land=${landId}&folder=collect`,
    )
    expect(projectPurchasesPath(projectId, 'collect')).toBe(
      `/admin/payments?project=${projectId}&folder=collect`,
    )
  })
})

describe('ContributeModal amount helpers', () => {
  it('blocks amounts below the minimum and does not proceed', () => {
    const error = validateContributeAmount({
      amountUsd: 5,
      minContributionUsd: 10,
      fundingGoalUsd: 300000,
    })
    expect(error).toMatch(/Minimum contribution/)
    expect(
      validateContributeAmount({
        amountUsd: 50,
        minContributionUsd: 10,
        fundingGoalUsd: 300000,
      }),
    ).toBeNull()
    expect(contributionGoalPercent(50, 300000)).toBeCloseTo(0.02, 2)
  })

  it('stores Anonymous display name while keeping receipt email separate', () => {
    expect(anonymousDisplayName(true, 'Jane Doe')).toBe('Anonymous')
    expect(anonymousDisplayName(false, 'Jane Doe')).toBe('Jane Doe')
  })
})

describe('project RLS (integration)', () => {
  it('public project returns data for unauthenticated query', async () => {
    if (!(await supabaseReachable())) return

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const slug = `public-test-${Date.now()}`
    const { error: insertErr } = await admin.from('projects').insert({
      title: 'Public Test School',
      slug,
      description: 'Public education project for RLS test.',
      type: 'education',
      visibility: 'public',
      status: 'active',
      funding_goal_usd: 50000,
    })
    expect(insertErr).toBeNull()

    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await anon
      .from('projects')
      .select('id, slug, visibility')
      .eq('slug', slug)
    expect(error).toBeNull()
    expect(data?.length).toBe(1)

    await admin.from('projects').delete().eq('slug', slug)
  })

  it('private project returns zero rows for unauthenticated query', async () => {
    if (!(await supabaseReachable())) return

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const slug = `private-test-${Date.now()}`
    const { error: insertErr } = await admin.from('projects').insert({
      title: 'Private Investment',
      slug,
      description: 'Private investment project for RLS test.',
      type: 'investment',
      visibility: 'private',
      status: 'active',
      funding_goal_usd: 100000,
    })
    expect(insertErr).toBeNull()

    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await anon
      .from('projects')
      .select('id')
      .eq('slug', slug)
    expect(error).toBeNull()
    expect(data?.length ?? 0).toBe(0)

    await admin.from('projects').delete().eq('slug', slug)
  })

  it('follower can read project but cannot insert payments', async () => {
    if (!(await supabaseReachable())) return

    const service = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const sellerId = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'
    const slug = `follower-proj-${Date.now()}`

    const { data: project, error: projErr } = await service
      .from('projects')
      .insert({
        title: 'Follower Readable',
        slug,
        description: 'Private project readable by follower.',
        type: 'community_cause',
        visibility: 'private',
        status: 'active',
        funding_goal_usd: 20000,
      })
      .select('id')
      .single()
    expect(projErr).toBeNull()

    const { error: partErr } = await service.from('project_participants').insert({
      project_id: project!.id,
      user_id: sellerId,
      role: 'follower',
    })
    expect(partErr).toBeNull()

    const follower = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error: signInErr } = await follower.auth.signInWithPassword({
      email: 'seller@sashacrush.com',
      password: 'changeme-local-only',
    })
    expect(signInErr).toBeNull()

    const { data: readable, error: readErr } = await follower
      .from('projects')
      .select('id')
      .eq('id', project!.id)
    expect(readErr).toBeNull()
    expect(readable?.length).toBe(1)

    const { error: payErr } = await follower.from('payments').insert({
      land_id: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
      project_id: project!.id,
      amount_usd: 25,
      status: 'pending',
    })
    expect(payErr).not.toBeNull()

    await service.from('projects').delete().eq('id', project!.id)
  })

  it('Mubende payment flow still creates a receipt after project_id column exists', async () => {
    if (!(await supabaseReachable())) return

    const admin = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const service = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error: signInErr } = await admin.auth.signInWithPassword({
      email: 'admin@sashacrush.com',
      password: 'changeme-local-only',
    })
    expect(signInErr).toBeNull()

    const landId = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'
    const sellerId = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44'
    const projectId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

    const { data: payment, error: payErr } = await admin
      .from('payments')
      .insert({
        land_id: landId,
        project_id: projectId,
        amount_usd: 100,
        amount_ugx: 370000,
        method: 'manual',
        status: 'pending',
        rate_used: 3700,
      })
      .select('id')
      .single()
    expect(payErr).toBeNull()

    // Confirm + receipt via service_role (mirrors edge confirm-payment path)
    const { error: confirmErr } = await service
      .from('payments')
      .update({ status: 'confirmed' })
      .eq('id', payment!.id)
    expect(confirmErr).toBeNull()

    const receiptNumber = `SC-TEST-${Date.now()}`
    const { data: receipt, error: receiptErr } = await service
      .from('receipts')
      .insert({
        payment_id: payment!.id,
        project_id: projectId,
        seller_id: sellerId,
        receipt_number: receiptNumber,
        amount_usd: 100,
        amount_ugx: 370000,
        rate_used: 3700,
        land_id: landId,
        land_title: 'Mubende Land',
      })
      .select('id, receipt_number, project_id, payment_id')
      .single()

    expect(receiptErr).toBeNull()
    expect(receipt?.receipt_number).toBe(receiptNumber)
    expect(receipt?.project_id).toBe(projectId)
    expect(receipt?.payment_id).toBe(payment!.id)
  })
})
