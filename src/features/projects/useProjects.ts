import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Project, ProjectStatus, ProjectType, ProjectVisibility } from '@/types/projects'

export const PROJECTS_QUERY_KEY = ['projects'] as const

const PROJECT_COLUMNS =
  'id, title, slug, description, cause, type, created_by, owner_id, visibility, funding_goal_usd, funding_raised_usd, min_contribution_usd, location_name, country, latitude, longitude, boundary_geojson, start_date, target_date, completed_date, status, cover_image_path, tags, external_links, land_id, created_at, updated_at'

export interface UseProjectsFilters {
  type?: ProjectType
  status?: ProjectStatus
  visibility?: ProjectVisibility
}

interface FetchProjectsOptions {
  /** Guests: force public only. Authenticated: rely on RLS (executives see all; agents see public + memberships). */
  forcePublic: boolean
  /** When true, hide draft projects (investors / public browse). Staff keep drafts. */
  hideDrafts: boolean
}

async function fetchProjects(
  filters: UseProjectsFilters | undefined,
  options: FetchProjectsOptions,
): Promise<Project[]> {
  let query = supabase
    .from('projects')
    .select(PROJECT_COLUMNS)
    .order('created_at', { ascending: false })

  if (options.forcePublic) {
    query = query.eq('visibility', 'public')
  } else if (filters?.visibility) {
    query = query.eq('visibility', filters.visibility)
  }

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  } else if (options.hideDrafts) {
    query = query.neq('status', 'draft')
  }

  const { data, error } = await query
  if (error) {
    throw error
  }
  return (data ?? []) as Project[]
}

export function useProjects(filters?: UseProjectsFilters): {
  projects: Project[]
  isLoading: boolean
  error: string | null
} {
  const { user } = useAuth()
  const isStaff = user?.role === 'admin' || user?.role === 'executive'
  const forcePublic = !user
  const hideDrafts = !isStaff

  const query = useQuery({
    queryKey: [
      ...PROJECTS_QUERY_KEY,
      user?.role ?? 'anon',
      forcePublic ? 'public' : 'rls',
      hideDrafts ? 'no-draft' : 'with-draft',
      filters?.type ?? null,
      filters?.status ?? null,
      filters?.visibility ?? null,
    ],
    queryFn: () => fetchProjects(filters, { forcePublic, hideDrafts }),
    staleTime: 2 * 60 * 1000,
  })

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  }
}
