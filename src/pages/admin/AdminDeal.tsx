import { useParams } from 'react-router-dom'
import { DealSummaryPanel } from '@/features/deals/DealSummaryPanel'
import { useDealSummary } from '@/features/deals/useDealSummary'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function AdminDealPage() {
  const { landId = '' } = useParams()
  const dealQuery = useDealSummary(landId, true)

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
          deal={dealQuery.data}
          backLink={{ to: '/admin/land-records', label: 'Land Records' }}
          quickActions={[
            {
              label:
                dealQuery.data.unreadCount > 0
                  ? `Open messages (${dealQuery.data.unreadCount})`
                  : 'Open messages',
              to: `/admin/chat?land=${dealQuery.data.land.id}`,
              primary: true,
            },
            {
              label: 'Documents',
              to: `/admin/documents?land=${dealQuery.data.land.id}`,
            },
            {
              label: 'Payments',
              to: `/admin/payments?land=${dealQuery.data.land.id}`,
            },
          ]}
        />
      )}
    </div>
  )
}
