import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { Project } from '@/types/projects'

type Client = SupabaseClient<Database>

/** Stable private slug used when a land deal gets an auto-linked funding project. */
export function landAcquisitionSlug(landId: string): string {
  return `land-${landId.replace(/-/g, '')}`
}

/** Admin/agent land workspace URL. */
export function landWorkspacePath(
  roleBase: '/admin' | '/agent' | '/executive',
  landId: string,
  folder?: string,
): string {
  if (roleBase === '/executive') {
    return `/executive/deals/${encodeURIComponent(landId)}`
  }
  const q = new URLSearchParams({ land: landId })
  if (folder) q.set('folder', folder)
  return `${roleBase}/land-records?${q}`
}

/** Project purchases library, optionally into a payment folder. */
export function projectPurchasesPath(
  projectId: string,
  folder?: string,
): string {
  const q = new URLSearchParams({ project: projectId })
  if (folder) q.set('folder', folder)
  return `/admin/payments?${q}`
}

/** Purchases entry that resolves the land → linked project on the payments page. */
export function landPurchasesPath(landId: string, folder = 'collect'): string {
  const q = new URLSearchParams({ land: landId, folder })
  return `/admin/payments?${q}`
}

export interface LandSeedForProject {
  id: string
  title: string
  description?: string | null
  location?: string | null
  total_value_usd?: number | null
  latitude?: number | null
  longitude?: number | null
  boundary_geojson?: Project['boundary_geojson']
  status?: string | null
}

const LINKED_PROJECT_COLUMNS =
  'id, title, slug, description, cause, type, created_by, owner_id, visibility, funding_goal_usd, funding_raised_usd, min_contribution_usd, location_name, country, latitude, longitude, boundary_geojson, start_date, target_date, completed_date, status, cover_image_path, tags, external_links, land_id, created_at, updated_at'

/** Find the funding project linked to a land deal (by land_id, then legacy slug). */
export async function fetchProjectForLand(
  client: Client,
  landId: string,
): Promise<Project | null> {
  const byLand = await client
    .from('projects')
    .select(LINKED_PROJECT_COLUMNS)
    .eq('land_id', landId)
    .maybeSingle()

  if (byLand.error) throw byLand.error
  if (byLand.data) return byLand.data as Project

  const bySlug = await client
    .from('projects')
    .select(LINKED_PROJECT_COLUMNS)
    .eq('slug', landAcquisitionSlug(landId))
    .maybeSingle()

  if (bySlug.error) throw bySlug.error
  if (!bySlug.data) return null

  const legacy = bySlug.data as Project
  if (!legacy.land_id) {
    const { error: linkError } = await client
      .from('projects')
      .update({ land_id: landId })
      .eq('id', legacy.id)
      .is('land_id', null)
    if (!linkError) {
      return { ...legacy, land_id: landId }
    }
  }
  return legacy
}

/**
 * Ensure a private land_acquisition project exists for this deal and is linked.
 * Idempotent — returns the existing linked project when present.
 */
export async function ensureLandFundingProject(
  client: Client,
  land: LandSeedForProject,
  actorUserId: string,
): Promise<Project> {
  const existing = await fetchProjectForLand(client, land.id)
  if (existing) return existing

  const slug = landAcquisitionSlug(land.id)
  const description =
    (land.description && land.description.trim()) ||
    `Land acquisition funding and purchases for ${land.title}.`

  const { data: created, error } = await client
    .from('projects')
    .insert({
      title: land.title,
      slug,
      description,
      cause: 'Seller disbursements and project purchases for this land acquisition.',
      type: 'land_acquisition',
      visibility: 'private',
      funding_goal_usd: land.total_value_usd ?? null,
      funding_raised_usd: 0,
      min_contribution_usd: 10,
      location_name: land.location ?? null,
      country: 'Uganda',
      latitude: land.latitude ?? null,
      longitude: land.longitude ?? null,
      boundary_geojson: land.boundary_geojson ?? null,
      status: land.status === 'archived' ? 'completed' : 'active',
      tags: ['land', 'deal-linked'],
      external_links: {},
      created_by: actorUserId,
      owner_id: actorUserId,
      land_id: land.id,
    })
    .select(LINKED_PROJECT_COLUMNS)
    .single()

  if (error) {
    // Race: another request created the slug/link first.
    const raced = await fetchProjectForLand(client, land.id)
    if (raced) return raced
    throw error
  }

  return created as Project
}
