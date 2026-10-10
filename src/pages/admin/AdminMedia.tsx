import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MediaVaultView } from '@/features/media/components/MediaVaultView'
import { ProjectLibraryShell } from '@/features/projects/components/ProjectLibraryShell'
import { ProjectMediaPanel } from '@/features/projects/components/ProjectMediaPanel'
import { supabase } from '@/lib/supabase'

export function AdminMediaPage() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('project')

  const projectQuery = useQuery({
    queryKey: ['project-by-id', projectId, 'media-title'],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .eq('id', projectId!)
        .single()
      if (error || !data) throw error ?? new Error('Project not found.')
      return data as { id: string; title: string }
    },
  })

  if (projectId) {
    return (
      <ProjectLibraryShell projectId={projectId} folder="media">
        {projectQuery.data ? (
          <ProjectMediaPanel
            projectId={projectId}
            projectTitle={projectQuery.data.title}
          />
        ) : (
          <p className="text-[13px] text-muted">Loading…</p>
        )}
      </ProjectLibraryShell>
    )
  }

  return (
    <MediaVaultView canUpload backTo="/admin/media-hub" backLabel="Media" />
  )
}
