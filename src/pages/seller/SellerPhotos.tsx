import { PageHeader } from '@/components/ui/PageHeader'
import { PhotosBrowser } from '@/features/photos/components/PhotosBrowser'
import { useSellerLands } from '@/features/seller/useSellerLands'

export function SellerPhotosPage() {
  const { lands, isLoading, error } = useSellerLands()

  return (
    <div className="ui-page">
      <PageHeader
        backTo="/seller/dashboard"
        backLabel="Dashboard"
        title="Property Photos"
        description="Open a deal, then take a site photo."
      />

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
