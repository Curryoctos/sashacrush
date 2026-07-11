import { Link } from 'react-router-dom'
import { useAgentDashboardStats } from '@/features/dashboard/useAgentDashboardStats'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function AgentDashboard() {
  const { user } = useAuth()
  const { data: stats, isLoading, error } = useAgentDashboardStats()

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-ink">Agent Dashboard</h1>
          <p className="mt-2 text-muted">Signed in as {user?.email}</p>
          <p className="mt-4 text-sm text-muted">
            Field operations — view deals, message sellers, and upload GPS-tagged photos.
          </p>
        </div>

        {isLoading && <p className="text-sm text-muted">Loading overview…</p>}

        {error && (
          <p className="text-sm text-red-700" role="alert">
            {formatSupabaseError(error as Error)}
          </p>
        )}

        {stats && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted">Active properties</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{stats.activeLands}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted">Docs awaiting sign</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{stats.docsAwaitingSign}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted">Pending payments</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{stats.pendingPayments}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            to="/agent/land-records"
            className="inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Land Records
          </Link>
          <Link
            to="/agent/chat"
            className="inline-flex rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-ink hover:bg-slate-50"
          >
            Seller Messages
          </Link>
          <Link
            to="/agent/photos"
            className="inline-flex rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-ink hover:bg-slate-50"
          >
            Field Photos
          </Link>
        </div>
      </div>
    </div>
  )
}
