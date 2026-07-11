import { useParams } from 'react-router-dom'
import { DealSummaryPanel } from '@/features/deals/DealSummaryPanel'
import { useDealSummary } from '@/features/deals/useDealSummary'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function AdminDealPage() {
  const { landId = '' } = useParams()
  const dealQuery = useDealSummary(landId, true)

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
