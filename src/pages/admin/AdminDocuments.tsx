import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { DocumentsBrowser } from '@/features/documents/components/DocumentsBrowser'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types'

const LAND_COLUMNS = 'id, title, location, seller_id'

export function AdminDocumentsPage() {
  const landsQuery = useQuery({
    queryKey: ['land-records', 'admin-documents'],
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

  return (
    <div className="ui-page">
      <PageHeader
        backTo="/admin/documents-hub"
        backLabel="Documents"
        title="Documents"
        description="Expand a deal, then switch list or board."
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
