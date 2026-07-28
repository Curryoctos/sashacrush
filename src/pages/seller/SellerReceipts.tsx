import { useMemo, useState } from 'react'
import { ArrowLeft, Download, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { IconActionButton } from '@/components/ui/IconActionButton'
import {
  DealCards,
  FolderCards,
  HierarchyNav,
} from '@/components/hierarchy/Hierarchy'
import { useReceipts } from '@/features/payments/useReceipts'
import { useReceiptDownload } from '@/features/payments/useReceiptDownload'
import { useLandHierarchyNav } from '@/hooks/useLandHierarchyNav'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatUgx, formatUsd } from '@/lib/formatters'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function SellerReceiptsPage() {
  const { user } = useAuth()
  const { data: receipts, isLoading, error } = useReceipts()
  const { downloadReceipt, isDownloading } = useReceiptDownload()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const deals = useMemo(() => {
    const map = new Map<string, { id: string; title: string; count: number }>()
    for (const receipt of receipts ?? []) {
      if (!receipt.land_id) {
        continue
      }
      const current = map.get(receipt.land_id)
      if (current) {
        current.count += 1
      } else {
        map.set(receipt.land_id, {
          id: receipt.land_id,
          title: receipt.land_title || 'Untitled deal',
          count: 1,
        })
      }
    }
    return [...map.values()]
  }, [receipts])

  const { selectedLandId, selectedLand, selectedFolder, setNavigation } =
    useLandHierarchyNav(deals)

  const landReceipts = (receipts ?? []).filter(
    (receipt) => receipt.land_id === selectedLandId,
  )

  return (
    <div className="ui-page max-w-4xl">
      <div>
        <PageBackLink to="/seller/dashboard" label="Seller Dashboard" />
        <PageHeader
          className="mt-3"
          title="Receipts"
          description={
            user?.email
              ? `Signed in as ${user.email}. Open a deal, then receipts.`
              : 'Open a deal, then receipts.'
          }
        />
      </div>

      {isLoading && <p className="text-sm text-muted">Loading receipts…</p>}

      {error && (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      )}

      {!isLoading && !error && !selectedLand && (
        <DealCards
          deals={deals.map((deal) => ({
            id: deal.id,
            title: deal.title,
            hint: `${deal.count} receipt${deal.count === 1 ? '' : 's'}`,
          }))}
          onSelect={(id) => setNavigation(id, null)}
          emptyTitle="No receipts yet"
          emptyDescription="Receipts appear after each confirmed payment."
          prompt="Select a deal to view receipts."
        />
      )}

      {selectedLand && selectedFolder !== 'list' && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              { label: 'All deals', onClick: () => setNavigation(null, null) },
              { label: selectedLand.title },
            ]}
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="ui-section-title">{selectedLand.title}</h2>
              <p className="ui-section-desc">Choose a folder</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setNavigation(null, null)}>
              <ArrowLeft className="h-4 w-4" />
              All deals
            </Button>
          </div>
          <FolderCards
            folders={[
              {
                id: 'list',
                title: 'Receipts',
                description: 'Confirmed payment receipts for this deal',
                icon: <Receipt className="h-5 w-5" />,
                count: landReceipts.length,
                onSelect: () => setNavigation(selectedLand.id, 'list'),
              },
            ]}
          />
        </div>
      )}

      {selectedLand && selectedFolder === 'list' && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              { label: 'All deals', onClick: () => setNavigation(null, null) },
              {
                label: selectedLand.title,
                onClick: () => setNavigation(selectedLand.id, null),
              },
              { label: 'Receipts' },
            ]}
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="ui-section-title">Receipts</h2>
              <p className="ui-section-desc">{landReceipts.length} for {selectedLand.title}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setNavigation(selectedLand.id, null)}
            >
              <ArrowLeft className="h-4 w-4" />
              Folders
            </Button>
          </div>

          {landReceipts.length === 0 ? (
            <EmptyState title="No receipts for this deal" />
          ) : (
            <div className="space-y-3">
              {landReceipts.map((receipt) => (
                <Card key={receipt.id} padding="sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{receipt.receipt_number}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatUsd(receipt.amount_usd)}
                        {receipt.amount_ugx != null ? ` · ${formatUgx(receipt.amount_ugx)}` : ''}
                        {' · '}
                        {formatDate(receipt.created_at)}
                      </p>
                    </div>
                    {receipt.pdf_path && (
                      <IconActionButton
                        label="Download receipt"
                        icon={<Download className="h-4 w-4" />}
                        disabled={isDownloading && downloadingId === receipt.id}
                        onClick={() => {
                          setDownloadingId(receipt.id)
                          void downloadReceipt(receipt.pdf_path!).finally(() =>
                            setDownloadingId(null),
                          )
                        }}
                      />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
