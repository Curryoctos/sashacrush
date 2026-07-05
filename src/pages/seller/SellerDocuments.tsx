import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { DocumentList } from '@/features/documents/components/DocumentList'
import { notifySuccess } from '@/features/notifications/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types'

const SELLER_LAND_COLUMNS = 'id, title'

export function SellerDocumentsPage() {
  const { user } = useAuth()

  const landQuery = useQuery({
    queryKey: ['land-records', 'seller-documents', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<LandRecord | null> => {
      const { data, error } = await supabase
        .from('land_records')
        .select(SELLER_LAND_COLUMNS)
        .eq('seller_id', user!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw error
      }

      return (data as LandRecord | null) ?? null
    },
  })

  const landId = landQuery.data?.id ?? ''

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-ink">Documents</h1>
              <p className="mt-1 text-sm text-muted">Signed in as {user?.email}</p>
            </div>
            <Link
              to="/seller/dashboard"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Back to dashboard
            </Link>
          </div>
        </div>

        {landQuery.isLoading && (
          <p className="text-sm text-muted">Loading your documents…</p>
        )}

        {landQuery.error && (
          <p className="text-sm text-red-700" role="alert">
            {formatSupabaseError(landQuery.error as Error)}
          </p>
        )}

        {!landQuery.isLoading && !landQuery.error && !landId && (
          <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-muted">
            No land record assigned yet.
          </p>
        )}

        {landId && (
          <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <DocumentList
              landId={landId}
              onSigned={() => {
                notifySuccess('Document signed successfully.')
              }}
            />
          </section>
        )}
      </div>
    </div>
  )
}
