import { useAuth } from '@/hooks/useAuth'

export function ExecutiveDashboard() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-ink">Executive Dashboard</h1>
        <p className="mt-2 text-muted">Signed in as {user?.email}</p>
      </div>
    </div>
  )
}
