import { Link } from 'react-router-dom'
import { useExecutiveDeals } from '@/features/deals/useDealSummary'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function ExecutiveDashboard() {
  const { user } = useAuth()
  const { data: deals, isLoading, error } = useExecutiveDeals()

  const totals = (deals ?? []).reduce(
    (acc, deal) => ({
      pendingDocs: acc.pendingDocs + Number(deal.pending_docs),
      signedDocs: acc.signedDocs + Number(deal.signed_docs),
      confirmedPayments: acc.confirmedPayments + Number(deal.confirmed_payments),
      pendingPayments: acc.pendingPayments + Number(deal.pending_payments),
    }),
    { pendingDocs: 0, signedDocs: 0, confirmedPayments: 0, pendingPayments: 0 },
  )

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-ink">Executive Dashboard</h1>
          <p className="mt-2 text-muted">Signed in as {user?.email}</p>
        </div>

        {isLoading && <p className="text-sm text-muted">Loading portfolio…</p>}

        {error && (
          <p className="text-sm text-red-700" role="alert">
            {formatSupabaseError(error as Error)}
          </p>
        )}

        {deals && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Active deals" value={deals.length} />
              <StatCard label="Docs pending" value={totals.pendingDocs} />
              <StatCard label="Docs signed" value={totals.signedDocs} />
              <StatCard
                label="Payments"
                value={`${totals.confirmedPayments} / ${totals.pendingPayments} pending`}
              />
            </div>

            {deals.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-ink">Portfolio snapshot</h2>
                <ul className="mt-4 space-y-2">
                  {deals.slice(0, 5).map((deal) => (
                    <li key={deal.land_id}>
                      <Link
                        to={`/executive/deals/${deal.land_id}`}
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        <span className="font-medium text-ink">{deal.title}</span>
                        <span className="ml-2 text-muted">
                          {deal.pending_docs} pending docs · {deal.pending_payments} pending payments
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            to="/executive/deals"
            className="inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Deal Portfolio
          </Link>
          <Link
            to="/executive/chat"
            className="inline-flex rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-ink hover:bg-slate-50"
          >
            Executive Communications
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
    </div>
  )
}
