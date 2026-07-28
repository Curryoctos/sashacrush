import { useParams } from 'react-router-dom'
import { DealSummaryPanel } from '@/features/deals/DealSummaryPanel'
import { useDealSummary } from '@/features/deals/useDealSummary'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function AgentDealPage() {
  const { landId = '' } = useParams()
  const dealQuery = useDealSummary(landId, false)

  return (
    <div>
      {dealQuery.isLoading && (
        <div className="ui-page">
          <p className="text-sm text-muted">Loading deal…</p>
        </div>
      )}

      {dealQuery.error && (
        <div className="ui-page">
          <p className="ui-alert-danger" role="alert">
            {formatSupabaseError(dealQuery.error as Error)}
          </p>
        </div>
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
            {
              label: 'Documents',
              to: `/agent/documents?land=${dealQuery.data.land.id}`,
            },
          ]}
        />
      )}
    </div>
  )
}
