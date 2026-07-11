import { Link, useParams } from 'react-router-dom'
import { useExecutiveDeal } from '@/features/deals/useDealSummary'
import { formatUsd } from '@/lib/land-records'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function ExecutiveDealPage() {
  const { landId = '' } = useParams()
  const dealQuery = useExecutiveDeal(landId)

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link to="/executive/deals" className="text-sm text-brand-700 hover:underline">
            ← Deal Portfolio
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Deal Summary</h1>
        </div>

        {dealQuery.isLoading && <p className="text-sm text-muted">Loading deal…</p>}

        {dealQuery.error && (
          <p className="text-sm text-red-700" role="alert">
            {formatSupabaseError(dealQuery.error as Error)}
          </p>
        )}

        {!dealQuery.isLoading && !dealQuery.error && !dealQuery.data && (
          <p className="text-sm text-muted">Deal not found.</p>
        )}

        {dealQuery.data && (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-ink">{dealQuery.data.title}</h2>
              <p className="mt-1 text-sm text-muted">{dealQuery.data.location}</p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase text-muted">Seller</dt>
                  <dd className="mt-1 text-sm text-ink">
                    {dealQuery.data.seller_name ?? 'Unassigned'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted">Total value</dt>
                  <dd className="mt-1 text-sm font-medium text-ink">
                    {formatUsd(Number(dealQuery.data.total_value_usd))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted">Status</dt>
                  <dd className="mt-1 text-sm capitalize text-ink">{dealQuery.data.status}</dd>
                </div>
              </dl>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Docs awaiting sign" value={String(dealQuery.data.pending_docs)} />
              <StatCard label="Signed documents" value={String(dealQuery.data.signed_docs)} />
              <StatCard
                label="Payments confirmed"
                value={String(dealQuery.data.confirmed_payments)}
              />
              <StatCard
                label="Payments pending"
                value={String(dealQuery.data.pending_payments)}
              />
            </div>

            <Link
              to="/executive/chat"
              className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Executive communications
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-ink">{value}</p>
    </div>
  )
}
