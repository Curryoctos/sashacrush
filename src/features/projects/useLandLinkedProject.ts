import { useQuery } from '@tanstack/react-query'
import { fetchProjectForLand } from '@/features/projects/projectLandLink'
import { supabase } from '@/lib/supabase'
import type { Project } from '@/types/projects'

/** Linked funding project for a land deal workspace (if any). */
export function useLandLinkedProject(landId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['project-for-land', landId],
    enabled: Boolean(landId),
    queryFn: () => fetchProjectForLand(supabase, landId as string),
    staleTime: 60 * 1000,
  })

  return {
    project: (query.data ?? null) as Project | null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refresh: query.refetch,
  }
}
