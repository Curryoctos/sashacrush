import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { PhotosBrowser } from '@/features/photos/components/PhotosBrowser'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types'

export function AdminPhotosPage() {
  const landsQuery = useQuery({
    queryKey: ['land-records', 'admin-photos'],
    queryFn: async (): Promise<LandRecord[]> => {
      const { data, error } = await supabase
        .from('land_records')
        .select('id, title, latitude, longitude')
        .eq('status', 'active')
        .order('title')

      if (error) {
        throw error
      }

      return (data ?? []) as LandRecord[]
    },
  })

  return (
    <div className="ui-page">
      <PageHeader
        backTo="/admin/media-hub"
        backLabel="Media"
        title="Field Photos"
        description="Open a deal, then take a site photo."
      />

      <PhotosBrowser
        lands={landsQuery.data ?? []}
        isLoadingLands={landsQuery.isLoading}
        landsError={(landsQuery.error as Error | null) ?? null}
        canUpload
      />
    </div>
  )
}
