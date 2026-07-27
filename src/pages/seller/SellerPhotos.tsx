import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { PhotosBrowser } from '@/features/photos/components/PhotosBrowser'
import { useSellerLands } from '@/features/seller/useSellerLands'
import { useAuth } from '@/hooks/useAuth'

export function SellerPhotosPage() {
  const { user } = useAuth()
  const { lands, isLoading, error } = useSellerLands()

  return (
    <div className="ui-page max-w-4xl">
      <div>
        <PageBackLink to="/seller/dashboard" label="Seller Dashboard" />
        <PageHeader
          className="mt-3"
          title="Property Photos"
          description={
            user?.email
              ? `Signed in as ${user.email}. Open a deal, then the gallery.`
              : 'Open a deal, then the gallery.'
          }
        />
      </div>

      <PhotosBrowser
        lands={lands}
        isLoadingLands={isLoading}
        landsError={(error as Error | null) ?? null}
        canUpload
        emptyTitle="No land record assigned yet"
        emptyDescription="Photos appear once a property is assigned to you."
      />
    </div>
  )
}
