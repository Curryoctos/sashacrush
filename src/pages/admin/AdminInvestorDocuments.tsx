import { useQuery } from '@tanstack/react-query'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { DocumentsBrowser } from '@/features/documents/components/DocumentsBrowser'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { LandSummary } from '@/features/documents/useDocumentWorkspace'

export function AdminInvestorDocumentsPage() {
  const { user } = useAuth()

  const investorsQuery = useQuery({
    queryKey: ['users', 'executives', 'investor-documents'],
    queryFn: async (): Promise<LandSummary[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'executive')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (error) {
        throw error
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.full_name?.trim() || row.email,
        location: row.email,
        seller_id: row.id,
      }))
    },
  })

  return (
    <div className="ui-page max-w-6xl">
      <div>
        <PageBackLink to="/admin/capital" label="Company Capital" />
        <PageHeader
          className="mt-3"
          title="Investor agreements"
          description={
            user?.email
              ? `Signed in as ${user.email}. Upload investment agreements, then send them to a specific investor to sign.`
              : 'Upload investment agreements, then send them to a specific investor to sign.'
          }
        />
      </div>

      <DocumentsBrowser
        mode="investor"
        lands={investorsQuery.data ?? []}
        isLoadingLands={investorsQuery.isLoading}
        landsError={(investorsQuery.error as Error | null) ?? null}
        canUpload
        enableSendForSigning
        emptyTitle="No investors yet"
        emptyDescription="Create an executive (investor) user first, then upload and send agreements for signing."
      />
    </div>
  )
}
