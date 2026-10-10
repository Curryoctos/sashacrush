import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { DocumentsBrowser } from '@/features/documents/components/DocumentsBrowser'
import { ProjectDocumentsPanel } from '@/features/projects/components/ProjectDocumentsPanel'
import { ProjectLibraryShell } from '@/features/projects/components/ProjectLibraryShell'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types'

const LAND_COLUMNS = 'id, title, location, seller_id'

export function AdminDocumentsPage() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('project')

  const landsQuery = useQuery({
    queryKey: ['land-records', 'admin-documents'],
    enabled: !projectId,
    queryFn: async (): Promise<LandRecord[]> => {
      const { data, error } = await supabase
        .from('land_records')
        .select(LAND_COLUMNS)
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
      <ProjectLibraryShell projectId={projectId} folder="documents">
        <ProjectDocumentsPanel projectId={projectId} />
      </ProjectLibraryShell>
    )
  }

  return (
    <div className="ui-page">
      <PageHeader
        backTo="/admin/documents-hub"
        backLabel="Documents"
        title="Documents"
        description="Expand a deal, then switch list or board. Open a project workspace for project-scoped files."
      />

      <DocumentsBrowser
        lands={landsQuery.data ?? []}
        isLoadingLands={landsQuery.isLoading}
        landsError={(landsQuery.error as Error | null) ?? null}
        canUpload
        enableSendForSigning
        emptyTitle="No active land deals"
        emptyDescription="Create a land record first, then upload and send documents for signing."
      />
    </div>
  )
}
