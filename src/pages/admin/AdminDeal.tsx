import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  DealJourneyStrip,
  type DealJourneyStep,
} from '@/features/deals/DealJourneyStrip'
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

  const journey = useMemo((): DealJourneyStep[] => {
    if (!dealQuery.data) return []
    const id = dealQuery.data.land.id
    const payTo = linkedProject
      ? `/admin/payments?project=${linkedProject.id}&folder=collect`
      : landPurchasesPath(id, 'collect')
    return [
      {
        id: 'chat',
        label: 'Messages',
        hint: 'Align with seller',
        to: `/admin/chat?land=${id}`,
        done: dealQuery.data.unreadCount === 0,
      },
      {
        id: 'photos',
        label: 'Field proof',
        hint: 'GPS photos',
        to: `/admin/photos?land=${id}&folder=gallery`,
      },
      {
        id: 'docs',
        label: 'Documents',
        hint: 'Send & e-sign',
        to: `/admin/documents?land=${id}`,
      },
      {
        id: 'pay',
        label: 'Seller payouts',
        hint: 'MoMo / wire / manual',
        to: payTo,
        current: true,
      },
      {
        id: 'receipts',
        label: 'History',
        hint: 'Receipts & payouts',
        to: linkedProject
          ? `/admin/payments?project=${linkedProject.id}&folder=history`
          : landPurchasesPath(id, 'history'),
      },
    ]
  }, [dealQuery.data, linkedProject])

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
          <DealJourneyStrip steps={journey} />
          <div className="ui-page pb-0 space-y-3">
            <p className="text-sm text-muted">
              This deal cockpit is the single path for this land: message the
              seller → field proof → e-sign docs → seller payouts → receipts.
              Finance capital/crypto live under Finance; keep payouts here via
              the linked project when possible.
            </p>
            {linkedProject ? (
              <LinkedProjectCard
                projectId={linkedProject.id}
                projectTitle={linkedProject.title}
                projectSlug={linkedProject.slug}
              />
            ) : (
              <p className="ui-alert-warning" role="status">
                No funding project linked yet. Link a project on the land record
                or project detail so seller payouts stay in one money context.
                You can still open payouts from land, but a linked project is the
                clearer path.
              </p>
            )}
          </div>
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
                label: 'Seller payouts',
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
