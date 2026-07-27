import { useQuery } from '@tanstack/react-query'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { DocumentsBrowser } from '@/features/documents/components/DocumentsBrowser'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types'

const LAND_COLUMNS = 'id, title, location, seller_id'

export function AdminDocumentsPage() {
  const { user } = useAuth()

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
    <div className="ui-page max-w-6xl">
      <div>
        <PageBackLink to="/admin/dashboard" label="Admin Dashboard" />
        <PageHeader
          className="mt-3"
          title="Documents"
          description={
            user?.email
              ? `Signed in as ${user.email}. Expand a deal, then switch list or board.`
              : 'Expand a deal, then switch list or board.'
          }
        />
      </div>

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
