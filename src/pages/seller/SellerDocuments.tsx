import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { DocumentsBrowser } from '@/features/documents/components/DocumentsBrowser'
import { notifySuccess } from '@/features/notifications/useNotifications'
import { useSellerLands } from '@/features/seller/useSellerLands'
import { useAuth } from '@/hooks/useAuth'

export function SellerDocumentsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const signDocumentId = searchParams.get('sign')

  const { lands, selectedLandId, isLoading, error } = useSellerLands(signDocumentId)

  useEffect(() => {
    if (!signDocumentId || !selectedLandId) {
      return
    }

    setSearchParams(
      (prev) => {
        if (prev.get('land') === selectedLandId) {
          return prev
        }
        const next = new URLSearchParams(prev)
        next.set('land', selectedLandId)
        return next
      },
      { replace: true },
    )
  }, [signDocumentId, selectedLandId, setSearchParams])

  return (
    <div className="ui-page max-w-6xl">
      <div>
        <PageBackLink to="/seller/dashboard" label="Seller Dashboard" />
        <PageHeader
          className="mt-3"
          title="Documents"
          description={
            user?.email
              ? `Signed in as ${user.email}. Expand a deal, open a document, then sign.`
              : 'Expand a deal, open a document, then sign.'
          }
        />
      </div>

      <DocumentsBrowser
        lands={lands}
        isLoadingLands={isLoading}
        landsError={(error as Error | null) ?? null}
        highlightDocumentId={signDocumentId}
        emptyTitle="No land record assigned yet"
        emptyDescription="Once a deal is assigned to you, documents for signature will appear here."
        onSigned={() => {
          notifySuccess('Document signed successfully.')
        }}
      />
    </div>
  )
}
