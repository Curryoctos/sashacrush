import { useParams } from 'react-router-dom'
import { DealSummaryPanel } from '@/features/deals/DealSummaryPanel'
import { useDealSummary } from '@/features/deals/useDealSummary'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function AgentDealPage() {
  const { landId = '' } = useParams()
  const dealQuery = useDealSummary(landId, false)

  return (
    <div className="p-8">
      {dealQuery.isLoading && <p className="text-sm text-muted">Loading deal…</p>}

      {dealQuery.error && (
        <p className="text-sm text-red-700" role="alert">
          {formatSupabaseError(dealQuery.error as Error)}
        </p>
      )}

      {dealQuery.data && (
        <DealSummaryPanel
          deal={{ ...dealQuery.data, unreadCount: 0 }}
          backLink={{ to: '/agent/land-records', label: 'Land Records' }}
          quickActions={[
            {
              label: 'Field photos',
              to: `/agent/photos?land=${dealQuery.data.land.id}`,
              primary: true,
            },
          ]}
        />
      )}
    </div>
  )
}
