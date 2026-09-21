import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { useExecutiveLandMap } from '@/features/deals/useDealSummary'
import { PhotosBrowser } from '@/features/photos/components/PhotosBrowser'
import { useAuth } from '@/hooks/useAuth'

export function ExecutivePhotosPage() {
  const { user } = useAuth()
  const mapQuery = useExecutiveLandMap()

  const lands = (mapQuery.data ?? []).map((parcel) => ({
    id: parcel.land_id,
    title: parcel.title,
    latitude: parcel.latitude,
    longitude: parcel.longitude,
  }))

  return (
    <div className="ui-page max-w-4xl">
      <div>
        <PageBackLink to="/executive/dashboard" label="Executive Dashboard" />
        <PageHeader
          className="mt-3"
          title="Project Photos"
          description={
            user?.email
              ? `Signed in as ${user.email}. Browse field photos and open the site map for Uber and directions.`
              : 'Browse field photos and open the site map for Uber and directions.'
          }
        />
      </div>

      <PhotosBrowser
        lands={lands}
        isLoadingLands={mapQuery.isLoading}
        landsError={(mapQuery.error as Error | null) ?? null}
        canUpload={false}
        emptyTitle="No projects yet"
        emptyDescription="Photos appear once land deals are in the portfolio."
      />
    </div>
  )
}
