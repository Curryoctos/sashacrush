import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { PhotosBrowser } from '@/features/photos/components/PhotosBrowser'
import { ProjectLibraryShell } from '@/features/projects/components/ProjectLibraryShell'
import { ProjectPhotosPanel } from '@/features/projects/components/ProjectPhotosPanel'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types'

export function AdminPhotosPage() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('project')

  const landsQuery = useQuery({
    queryKey: ['land-records', 'admin-photos'],
    enabled: !projectId,
    queryFn: async (): Promise<LandRecord[]> => {
      const { data, error } = await supabase
        .from('land_records')
        .select('id, title, latitude, longitude')
        .eq('status', 'active')
        .order('title')

      if (error) {
        throw error
      }

      return (data ?? []) as LandRecord[]
    },
  })

  if (projectId) {
    return (
      <ProjectLibraryShell projectId={projectId} folder="photos">
        <ProjectPhotosPanel projectId={projectId} />
      </ProjectLibraryShell>
    )
  }

  return (
    <div className="ui-page">
      <PageHeader
        backTo="/admin/media-hub"
        backLabel="Media"
        title="Field Photos"
        description="Open a deal, then take a site photo. Project workspaces also attach photos by project."
      />

      <PhotosBrowser
        lands={landsQuery.data ?? []}
        isLoadingLands={landsQuery.isLoading}
        landsError={(landsQuery.error as Error | null) ?? null}
        canUpload
      />
    </div>
  )
}
