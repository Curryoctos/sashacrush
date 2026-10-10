import { useParams } from 'react-router-dom'
import { DealSummaryPanel } from '@/features/deals/DealSummaryPanel'
import { useDealSummary } from '@/features/deals/useDealSummary'
import { LinkedProjectCard } from '@/features/projects/components/LandProjectBridge'
import { landPurchasesPath } from '@/features/projects/projectLandLink'
import { useLandLinkedProject } from '@/features/projects/useLandLinkedProject'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function AdminDealPage() {
  const { landId = '' } = useParams()
  const dealQuery = useDealSummary(landId, true)
  const { project: linkedProject } = useLandLinkedProject(landId || null)

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
        <div className="space-y-4">
          {linkedProject ? (
            <div className="ui-page pb-0">
              <LinkedProjectCard
                projectId={linkedProject.id}
                projectTitle={linkedProject.title}
                projectSlug={linkedProject.slug}
              />
            </div>
          ) : null}
          <DealSummaryPanel
            deal={dealQuery.data}
            canEditBoundary
            backLink={{ to: '/admin/land-records', label: 'Land records' }}
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
                label: 'Field photos',
                to: `/admin/photos?land=${dealQuery.data.land.id}&folder=gallery`,
              },
              {
                label: 'Documents',
                to: `/admin/documents?land=${dealQuery.data.land.id}`,
              },
              {
                label: 'Purchases',
                to: linkedProject
                  ? `/admin/payments?project=${linkedProject.id}&folder=collect`
                  : landPurchasesPath(dealQuery.data.land.id, 'collect'),
              },
            ]}
          />
        </div>
      )}
    </div>
  )
}
