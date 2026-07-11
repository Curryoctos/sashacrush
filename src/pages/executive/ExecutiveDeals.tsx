import { Link } from 'react-router-dom'
import { useExecutiveDeals } from '@/features/deals/useDealSummary'
import { useAuth } from '@/hooks/useAuth'
import { formatUsd } from '@/lib/land-records'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function ExecutiveDealsPage() {
  const { user } = useAuth()
  const dealsQuery = useExecutiveDeals()

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-ink">Deal Portfolio</h1>
          <p className="mt-1 text-sm text-muted">
            Signed in as {user?.email} — aggregated deal status (no payment amounts)
          </p>
        </div>

        {dealsQuery.isLoading && <p className="text-sm text-muted">Loading deals…</p>}

        {dealsQuery.error && (
          <p className="text-sm text-red-700" role="alert">
            {formatSupabaseError(dealsQuery.error as Error)}
          </p>
        )}

        {dealsQuery.data && dealsQuery.data.length === 0 && (
          <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-muted">
            No active deals to display.
          </p>
        )}

        {dealsQuery.data && dealsQuery.data.length > 0 && (
          <div className="space-y-4">
            {dealsQuery.data.map((deal) => (
              <article
                key={deal.land_id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">{deal.title}</h2>
                    <p className="mt-1 text-sm text-muted">{deal.location}</p>
                    <p className="mt-2 text-sm text-muted">
                      Seller: {deal.seller_name ?? 'Unassigned'}
                    </p>
                    <p className="mt-1 text-sm font-medium text-ink">
                      {formatUsd(Number(deal.total_value_usd))}
                    </p>
                  </div>
                  <Link
                    to={`/executive/deals/${deal.land_id}`}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    View summary
                  </Link>
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
                  <div>
                    <dt className="text-xs uppercase text-muted">Docs pending</dt>
                    <dd className="mt-1 font-medium text-ink">{deal.pending_docs}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted">Docs signed</dt>
                    <dd className="mt-1 font-medium text-ink">{deal.signed_docs}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted">Payments confirmed</dt>
                    <dd className="mt-1 font-medium text-ink">{deal.confirmed_payments}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted">Payments pending</dt>
                    <dd className="mt-1 font-medium text-ink">{deal.pending_payments}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
