import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { CargoShipmentList } from '@/features/cargo/components/CargoShipmentList'
import { useCargoShipments } from '@/features/cargo/useCargo'
import { notifyInfo, notifySuccess } from '@/features/notifications/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function AgentCargoPage() {
  const { user } = useAuth()
  const { shipments, isLoading, error, approveStage } = useCargoShipments()

  return (
    <div className="ui-page max-w-4xl space-y-6">
      <div>
        <PageBackLink to="/agent/dashboard" label="Agent Dashboard" />
        <PageHeader
          className="mt-3"
          eyebrow="CurryOctos"
          title="Assigned cargo"
          description={
            user?.email
              ? `Signed in as ${user.email}. View status, upload import docs, and approve the current stage.`
              : 'View status, upload import docs, and approve the current stage.'
          }
        />
      </div>

      {isLoading ? <p className="text-sm text-muted">Loading shipments…</p> : null}
      {error ? (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      ) : null}

      {!isLoading && !error ? (
        <CargoShipmentList
          shipments={shipments}
          userId={user?.id}
          emptyTitle="No shipments assigned to you."
          onApprove={async (shipment, note) => {
            try {
              await approveStage(shipment, note)
              notifySuccess('Stage approved.')
            } catch (err) {
              notifyInfo(err instanceof Error ? err.message : 'Could not approve.')
              throw err
            }
          }}
        />
      ) : null}
    </div>
  )
}
