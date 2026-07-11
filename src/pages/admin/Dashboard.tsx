import { Link } from 'react-router-dom'
import { useAdminDashboardStats } from '@/features/dashboard/useAdminDashboardStats'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'

function StatCard({
  label,
  value,
  to,
}: {
  label: string
  value: string | number
  to?: string
}) {
  const content = (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block transition hover:ring-2 hover:ring-brand-200 rounded-xl">
        {content}
      </Link>
    )
  }

  return content
}

export function AdminDashboard() {
  const { user } = useAuth()
  const { data: stats, isLoading, error } = useAdminDashboardStats()

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-ink">Admin Dashboard</h1>
          <p className="mt-2 text-muted">Signed in as {user?.email}</p>
        </div>

        {isLoading && <p className="text-sm text-muted">Loading overview…</p>}

        {error && (
          <p className="text-sm text-red-700" role="alert">
            {formatSupabaseError(error as Error)}
          </p>
        )}

        {stats && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Active properties" value={stats.activeLands} to="/admin/land-records" />
              <StatCard
                label="Pending payments"
                value={stats.pendingPayments}
                to="/admin/payments"
              />
              <StatCard
                label="Docs awaiting sign"
                value={stats.docsAwaitingSign}
                to="/admin/documents"
              />
              <StatCard
                label="Unread messages"
                value={stats.unreadMessages}
                to="/admin/chat"
              />
            </div>

            {stats.recentDeals.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-ink">Recent deals</h2>
                <ul className="mt-4 space-y-3">
                  {stats.recentDeals.map((deal) => (
                    <li key={deal.id}>
                      <Link
                        to={`/admin/deals/${deal.id}`}
                        className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink">{deal.title}</p>
                          {deal.location && (
                            <p className="text-xs text-muted">{deal.location}</p>
                          )}
                        </div>
                        <span className="text-xs font-medium text-brand-700">Open deal →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-wrap gap-3">
              <Link
                to="/admin/land-records"
                className="inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                Manage land records
              </Link>
              <Link
                to="/admin/chat"
                className="inline-flex rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-ink hover:bg-slate-50"
              >
                Messages
                {stats.unreadMessages > 0 && ` (${stats.unreadMessages})`}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
