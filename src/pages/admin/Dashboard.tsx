import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function AdminDashboard() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-ink">Admin Dashboard</h1>
        <p className="mt-2 text-muted">Signed in as {user?.email}</p>

        <div className="mt-8">
          <Link
            to="/admin/land-records"
            className="inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Manage land records
          </Link>
        </div>
      </div>
    </div>
  )
}
