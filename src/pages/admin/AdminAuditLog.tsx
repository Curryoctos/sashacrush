import { Card } from '@/components/ui/Card'
import { EmptyState, PageHeader } from '@/components/ui/PageHeader'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { useAuditLog } from '@/features/audit/useAuditLog'

export function AdminAuditLogPage() {
  const { data: entries, isLoading, error } = useAuditLog()

  return (
    <div className="ui-page max-w-5xl">
      <PageHeader
        title="Audit Log"
        description="Track land record, payment, and document changes across the platform."
      />

      {isLoading && <p className="text-sm text-muted">Loading audit entries…</p>}

      {error && (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      )}

      {!isLoading && !error && entries?.length === 0 && (
        <EmptyState title="No audit entries yet." />
      )}

      {entries && entries.length > 0 && (
        <Card padding="none">
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="text-muted">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td>{entry.actor_email ?? 'System'}</td>
                    <td className="font-medium">{entry.action}</td>
                    <td>
                      {entry.entity_type}
                      <span className="block text-xs text-muted">{entry.entity_id}</span>
                    </td>
                    <td className="text-xs text-muted">
                      {entry.metadata ? JSON.stringify(entry.metadata) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
