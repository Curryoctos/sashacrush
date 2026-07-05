import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { formatUsd } from '@/lib/land-records'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types/database'

const SELLER_LAND_COLUMNS = 'id, title, description, location, total_value_usd, status'

export function SellerDashboard() {
  const { user } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: ['land-records', 'seller', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<LandRecord[]> => {
      const { data: records, error: queryError } = await supabase
        .from('land_records')
        .select(SELLER_LAND_COLUMNS)
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false })

      if (queryError) {
        throw queryError
      }

      return (records ?? []) as LandRecord[]
    },
  })

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-ink">Seller Dashboard</h1>
          <p className="mt-2 text-muted">Signed in as {user?.email}</p>
          <Link
            to="/seller/chat"
            className="mt-6 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Messages
          </Link>
          <Link
            to="/seller/documents"
            className="mt-6 ml-3 inline-flex rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-ink hover:bg-slate-50"
          >
            Documents
          </Link>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Your land record</h2>
          <p className="mt-1 text-sm text-muted">
            Property details assigned to your account. Payment information is not shown here.
          </p>

          {isLoading && <p className="mt-6 text-sm text-muted">Loading your land record…</p>}

          {error && (
            <p className="mt-6 text-sm text-red-700" role="alert">
              {formatSupabaseError(error as Error)}
            </p>
          )}

          {!isLoading && !error && data?.length === 0 && (
            <p className="mt-6 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-muted">
              No land record assigned yet.
            </p>
          )}

          {data && data.length > 0 && (
            <div className="mt-6 space-y-4">
              {data.map((record) => (
                <article
                  key={record.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-5"
                >
                  <h3 className="text-lg font-semibold text-ink">{record.title}</h3>
                  {record.description && (
                    <p className="mt-2 text-sm text-muted">{record.description}</p>
                  )}
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                        Location
                      </dt>
                      <dd className="mt-1 text-sm text-ink">{record.location}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                        Total value
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-ink">
                        {formatUsd(record.total_value_usd)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
