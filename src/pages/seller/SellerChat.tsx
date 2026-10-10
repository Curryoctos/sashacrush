import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { BackArrow } from '@/components/ui/BackArrow'
import { PageHeader } from '@/components/ui/PageHeader'
import { DealCards, HierarchyNav } from '@/components/hierarchy/Hierarchy'
import { ChatWindow } from '@/features/chat/components/ChatWindow'
import { useSellerLands } from '@/features/seller/useSellerLands'
import { useLandHierarchyNav } from '@/hooks/useLandHierarchyNav'

export function SellerChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { lands, isLoading, error } = useSellerLands()
  const { selectedLand, setNavigation } = useLandHierarchyNav(lands)

  // Keep single-deal sellers able to deep-open via ?land=
  useEffect(() => {
    if (searchParams.get('land') || lands.length !== 1) {
      return
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('land', lands[0].id)
        return next
      },
      { replace: true },
    )
  }, [lands, searchParams, setSearchParams])

  const dealCards = useMemo(
    () =>
      lands.map((land) => ({
        id: land.id,
        title: land.title,
        hint: 'Open conversation',
      })),
    [lands],
  )

  return (
    <div className="ui-page">
      <PageHeader
        backTo="/seller/dashboard"
        backLabel="Dashboard"
        title="Messages"
        description="Select a deal to open the conversation."
      />

      {isLoading && <p className="text-sm text-muted">Loading deals…</p>}

      {error && (
        <p className="ui-alert-danger" role="alert">
          Could not load your property. Please try again.
        </p>
      )}

      {!isLoading && !error && !selectedLand && (
        <DealCards
          deals={dealCards}
          onSelect={(id) => setNavigation(id, null)}
          emptyTitle="No land record assigned yet"
          emptyDescription="Messages appear once a property is assigned to you."
          prompt="Select a deal to message the team."
        />
      )}

      {selectedLand && (
        <div className="space-y-5">
          {lands.length > 1 && (
            <HierarchyNav
              crumbs={[
                {
                  label: 'All deals',
                  onClick: () => setNavigation(null, null),
                },
                { label: selectedLand.title },
              ]}
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="ui-section-title">{selectedLand.title}</h2>
            {lands.length > 1 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setNavigation(null, null)}
              >
                <BackArrow />
                All deals
              </Button>
            )}
          </div>
          <ChatWindow landId={selectedLand.id} channel="seller_channel" />
        </div>
      )}
    </div>
  )
}
