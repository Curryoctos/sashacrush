import { formatSupabaseError } from '@/lib/supabase-errors'
import { useAuditLog } from '@/features/audit/useAuditLog'

export function AdminAuditLogPage() {
  const { data: entries, isLoading, error } = useAuditLog()

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Audit Log</h1>
          <p className="mt-1 text-sm text-muted">
            Track land record, payment, and document changes across the platform.
          </p>
        </div>

        {isLoading && <p className="text-sm text-muted">Loading audit entries…</p>}

        {error && (
          <p className="text-sm text-red-700" role="alert">
            {formatSupabaseError(error as Error)}
          </p>
        )}

        {!isLoading && !error && entries?.length === 0 && (
          <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-muted">
            No audit entries yet.
          </p>
        )}

        {entries && entries.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-muted">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{entry.actor_email ?? 'System'}</td>
                    <td className="px-4 py-3 font-medium text-ink">{entry.action}</td>
                    <td className="px-4 py-3">
                      {entry.entity_type}
                      <span className="block text-xs text-muted">{entry.entity_id}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {entry.metadata ? JSON.stringify(entry.metadata) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
