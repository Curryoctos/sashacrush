import { useQuery } from '@tanstack/react-query'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { PhotosBrowser } from '@/features/photos/components/PhotosBrowser'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types'

export function AgentPhotosPage() {
  const { user } = useAuth()

  const landsQuery = useQuery({
    queryKey: ['land-records', 'agent-photos'],
    queryFn: async (): Promise<LandRecord[]> => {
      const { data, error } = await supabase
        .from('land_records')
        .select('id, title')
        .eq('status', 'active')
        .order('title')

      if (error) {
        throw error
      }

      return (data ?? []) as LandRecord[]
    },
  })

  return (
    <div className="ui-page max-w-4xl">
      <div>
        <PageBackLink to="/agent/dashboard" label="Agent Dashboard" />
        <PageHeader
          className="mt-3"
          title="Field Photos"
          description={
            user?.email
              ? `Signed in as ${user.email}. Open a deal, then the gallery.`
              : 'Open a deal, then the gallery.'
          }
        />
      </div>

      <PhotosBrowser
        lands={landsQuery.data ?? []}
        isLoadingLands={landsQuery.isLoading}
        landsError={(landsQuery.error as Error | null) ?? null}
        canUpload
      />
    </div>
  )
}
