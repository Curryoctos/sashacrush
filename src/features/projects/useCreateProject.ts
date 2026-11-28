import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { PROJECTS_QUERY_KEY } from '@/features/projects/useProjects'
import {
  resolveUniqueSlug,
  slugifyProjectTitle,
} from '@/features/projects/projectUtils'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type {
  Project,
  ProjectStatus,
  ProjectType,
  ProjectVisibility,
} from '@/types/projects'

export interface CreateProjectInput {
  title: string
  description: string
  cause?: string | null
  type: ProjectType
  visibility: ProjectVisibility
  funding_goal_usd?: number | null
  min_contribution_usd?: number
  location_name?: string | null
  country?: string
  latitude?: number | null
  longitude?: number | null
  boundary_geojson?: Project['boundary_geojson']
  start_date?: string | null
  target_date?: string | null
  cover_image_path?: string | null
  tags?: string[]
  external_links?: Project['external_links']
  status?: Extract<ProjectStatus, 'draft' | 'active'>
  owner_id?: string | null
  /** Optional land deal this project funds / purchases against. */
  land_id?: string | null
}

async function slugTaken(slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (error) {
    throw error
  }
  return data != null
}

export function useCreateProject(): {
  createProject: (data: CreateProjectInput) => Promise<Project>
  isLoading: boolean
  error: string | null
} {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (data: CreateProjectInput): Promise<Project> => {
      if (user?.role !== 'admin') {
        throw new Error('Only admins can create projects.')
      }

      const title = data.title.trim()
      const description = data.description.trim()
      if (!title) {
        throw new Error('Enter a project title.')
      }
      if (!description) {
        throw new Error('Enter a project description.')
      }

      const baseSlug = slugifyProjectTitle(title)
      const slug = await resolveUniqueSlug(baseSlug, slugTaken)

      const { data: created, error: insertError } = await supabase
        .from('projects')
        .insert({
          title,
          slug,
          description,
          cause: data.cause?.trim() || null,
          type: data.type,
          visibility: data.visibility,
          funding_goal_usd: data.funding_goal_usd ?? null,
          min_contribution_usd: data.min_contribution_usd ?? 10,
          location_name: data.location_name ?? null,
          country: data.country ?? 'Uganda',
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          boundary_geojson: data.boundary_geojson ?? null,
          start_date: data.start_date ?? null,
          target_date: data.target_date ?? null,
          cover_image_path: data.cover_image_path ?? null,
          tags: data.tags ?? [],
          external_links: data.external_links ?? {},
          status: data.status ?? 'draft',
          created_by: user.id,
          owner_id: data.owner_id ?? user.id,
          land_id: data.land_id ?? null,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }
      return created as Project
    },
    onSuccess: async () => {
      setError(null)
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    },
  })

  return {
    createProject: async (data) => {
      setError(null)
      try {
        return await mutation.mutateAsync(data)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create project'
        setError(message)
        throw err
      }
    },
    isLoading: mutation.isPending,
    error,
  }
}
