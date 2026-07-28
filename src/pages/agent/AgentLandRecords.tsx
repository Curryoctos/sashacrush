import { useQuery } from '@tanstack/react-query'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { LandRecordsBrowser } from '@/features/land-records/components/LandRecordsBrowser'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types'

const LAND_COLUMNS =
  'id, title, description, location, total_value_usd, seller_id, latitude, longitude, status, created_at'

const AGENT_FOLDERS = ['overview', 'documents', 'messages', 'photos'] as const

export function AgentLandRecordsPage() {
  const { user } = useAuth()

  const landsQuery = useQuery({
    queryKey: ['land-records', 'agent'],
    queryFn: async (): Promise<(LandRecord & { seller_label: string })[]> => {
      const { data: lands, error } = await supabase
        .from('land_records')
        .select(LAND_COLUMNS)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      const sellerIds = [
        ...new Set((lands ?? []).map((land) => land.seller_id).filter(Boolean)),
      ] as string[]

      const sellerLabels = new Map<string, string>()
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase
          .from('users')
          .select('id, email, full_name')
          .in('id', sellerIds)

        for (const seller of sellers ?? []) {
          sellerLabels.set(seller.id, seller.full_name ?? seller.email)
        }
      }

      return (lands ?? []).map((land) => ({
        ...(land as LandRecord),
        seller_label: land.seller_id
          ? (sellerLabels.get(land.seller_id) ?? 'Unknown seller')
          : 'Unassigned',
      }))
    },
  })

  return (
    <div className="ui-page max-w-4xl">
      <div>
        <PageBackLink to="/agent/dashboard" label="Agent Dashboard" />
        <PageHeader
          className="mt-3"
          title="Land Records"
          description={
            user?.email
              ? `Signed in as ${user.email}. Open a deal, then a folder.`
              : 'Open a deal, then a folder.'
          }
        />
      </div>

      <LandRecordsBrowser
        lands={landsQuery.data ?? []}
        isLoadingLands={landsQuery.isLoading}
        landsError={(landsQuery.error as Error | null) ?? null}
        roleBasePath="/agent"
        folders={[...AGENT_FOLDERS]}
        emptyTitle="No land records yet"
        emptyDescription="Land deals appear here once records are active."
      />
    </div>
  )
}
