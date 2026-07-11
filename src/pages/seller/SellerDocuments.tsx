import { Link, useSearchParams } from 'react-router-dom'
import { DocumentList } from '@/features/documents/components/DocumentList'
import { notifySuccess } from '@/features/notifications/useNotifications'
import { SellerLandSelector } from '@/features/seller/components/SellerLandSelector'
import { useSellerLands } from '@/features/seller/useSellerLands'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function SellerDocumentsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const signDocumentId = searchParams.get('sign')

  const {
    lands,
    selectedLand,
    selectedLandId,
    setSelectedLandId,
    isLoading,
    error,
  } = useSellerLands(signDocumentId)

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-ink">Documents</h1>
              <p className="mt-1 text-sm text-muted">Signed in as {user?.email}</p>
              {selectedLand?.title && (
                <p className="mt-1 text-sm text-muted">Property: {selectedLand.title}</p>
              )}
            </div>
            <Link
              to="/seller/dashboard"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Back to dashboard
            </Link>
          </div>

          {lands.length > 1 && (
            <div className="mt-6">
              <SellerLandSelector
                lands={lands}
                selectedLandId={selectedLandId}
                onSelect={setSelectedLandId}
              />
            </div>
          )}
        </div>

        {isLoading && <p className="text-sm text-muted">Loading your documents…</p>}

        {error && (
          <p className="text-sm text-red-700" role="alert">
            {formatSupabaseError(error as Error)}
          </p>
        )}

        {!isLoading && !error && !selectedLandId && (
          <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-muted">
            No land record assigned yet.
          </p>
        )}

        {selectedLandId && (
          <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            {signDocumentId && (
              <p className="mb-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-900">
                You have a document waiting for your signature below.
              </p>
            )}
            <DocumentList
              landId={selectedLandId}
              highlightDocumentId={signDocumentId}
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
