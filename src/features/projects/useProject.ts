import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  Project,
  ProjectMilestone,
  ProjectParticipant,
  ProjectUpdate,
  UserProfile,
} from '@/types/projects'

const PROJECT_COLUMNS =
  'id, title, slug, description, cause, type, created_by, owner_id, visibility, funding_goal_usd, funding_raised_usd, min_contribution_usd, location_name, country, latitude, longitude, boundary_geojson, start_date, target_date, completed_date, status, cover_image_path, tags, external_links, land_id, created_at, updated_at'

interface ProjectDetailResult {
  project: Project | null
  participants: ProjectParticipant[]
  updates: ProjectUpdate[]
  milestones: ProjectMilestone[]
}

async function fetchProjectDetail(slug: string): Promise<ProjectDetailResult> {
  const { data: project, error } = await supabase
    .from('projects')
    .select(PROJECT_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    throw error
  }
  if (!project) {
    return { project: null, participants: [], updates: [], milestones: [] }
  }

  const typed = project as Project

  const [participantsRes, updatesRes, milestonesRes] = await Promise.all([
    supabase
      .from('project_participants')
      .select('id, project_id, user_id, role, invited_by, joined_at, notes')
      .eq('project_id', typed.id)
      .order('joined_at', { ascending: true }),
    supabase
      .from('project_updates')
      .select(
        'id, project_id, author_id, title, body, update_type, is_public, created_at',
      )
      .eq('project_id', typed.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('project_milestones')
      .select(
        'id, project_id, title, description, target_date, completed_date, status, order_index, created_at',
      )
      .eq('project_id', typed.id)
      .order('order_index', { ascending: true }),
  ])

  if (participantsRes.error) throw participantsRes.error
  if (updatesRes.error) throw updatesRes.error
  if (milestonesRes.error) throw milestonesRes.error

  const userIds = [
    ...new Set([
      ...(participantsRes.data ?? []).map((row) => row.user_id),
      ...(updatesRes.data ?? []).map((row) => row.author_id),
    ]),
  ]

  const profiles = new Map<string, UserProfile>()
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .in('id', userIds)

    for (const user of users ?? []) {
      profiles.set(user.id, {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      })
    }
  }

  const participants: ProjectParticipant[] = (participantsRes.data ?? []).map(
    (row) => ({
      ...row,
      profile: profiles.get(row.user_id),
    }),
  ) as ProjectParticipant[]

  const updates: ProjectUpdate[] = (updatesRes.data ?? []).map((row) => ({
    ...row,
    author: profiles.get(row.author_id),
  })) as ProjectUpdate[]

  return {
    project: typed,
    participants,
    updates,
    milestones: (milestonesRes.data ?? []) as ProjectMilestone[],
  }
}

export function useProject(slug: string): {
  project: Project | null
  participants: ProjectParticipant[]
  updates: ProjectUpdate[]
  milestones: ProjectMilestone[]
  isLoading: boolean
  error: string | null
} {
  const query = useQuery({
    queryKey: ['project', slug],
    queryFn: () => fetchProjectDetail(slug),
    enabled: Boolean(slug),
    staleTime: 2 * 60 * 1000,
  })

  return {
    project: query.data?.project ?? null,
    participants: query.data?.participants ?? [],
    updates: query.data?.updates ?? [],
    milestones: query.data?.milestones ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  }
}
