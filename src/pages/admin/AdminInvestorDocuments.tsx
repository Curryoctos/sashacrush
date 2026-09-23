import { useQuery } from '@tanstack/react-query'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { DocumentsBrowser } from '@/features/documents/components/DocumentsBrowser'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { LandSummary } from '@/features/documents/useDocumentWorkspace'

export function AdminInvestorDocumentsPage() {
  const { user } = useAuth()

  const agentsQuery = useQuery({
    queryKey: ['users', 'agents', 'investor-documents'],
    queryFn: async (): Promise<LandSummary[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'agent')
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
        <PageBackLink to="/admin/documents-hub" label="Documents" />
        <PageHeader
          className="mt-3"
          title="Agent agreements"
          description={
            user?.email
              ? `Signed in as ${user.email}. Upload investment agreements, then send them to an agent to sign.`
              : 'Upload investment agreements, then send them to an agent to sign.'
          }
        />
      </div>

      <DocumentsBrowser
        mode="investor"
        lands={agentsQuery.data ?? []}
        isLoadingLands={agentsQuery.isLoading}
        landsError={(agentsQuery.error as Error | null) ?? null}
        canUpload
        enableSendForSigning
        emptyTitle="No agents yet"
        emptyDescription="Create an agent user first, then upload and send agreements for signing."
      />
    </div>
  )
}
