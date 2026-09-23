import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { CargoShipmentList } from '@/features/cargo/components/CargoShipmentList'
import { useCargoAgents, useCargoShipments } from '@/features/cargo/useCargo'
import { notifyInfo, notifySuccess } from '@/features/notifications/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function AdminCargoPage() {
  const { user } = useAuth()
  const agentsQuery = useCargoAgents()
  const { shipments, isLoading, error, createShipment, advanceStatus, assignAgent } =
    useCargoShipments()

  const [origin, setOrigin] = useState('Shenzhen, China')
  const [destination, setDestination] = useState('Nebraska, USA')
  const [description, setDescription] = useState('')
  const [expectedAt, setExpectedAt] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const onCreate = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setFormError(null)
    try {
      await createShipment({
        origin,
        destination,
        description,
        expectedAt,
        assigneeId: assigneeId || null,
      })
      notifySuccess('Shipment created.')
      setDescription('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create shipment.'
      setFormError(message)
      notifyInfo(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ui-page max-w-4xl space-y-6">
      <PageHeader
        eyebrow="CurryOctos"
        title="Cargo & imports"
        description={
          user?.email
            ? `Signed in as ${user.email}. Track China→USA machine shipments and collaborator approvals.`
            : 'Track China→USA machine shipments and collaborator approvals.'
        }
      />

      <Card>
        <CardHeader
          title="New shipment"
          description="Origin, destination, cargo description, and expected arrival."
        />
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => void onCreate(event)}>
          <label className="block space-y-1.5">
            <span className="ui-label">Origin</span>
            <input
              className="ui-input"
              value={origin}
              disabled={busy}
              onChange={(event) => setOrigin(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="ui-label">Destination</span>
            <input
              className="ui-input"
              value={destination}
              disabled={busy}
              onChange={(event) => setDestination(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="ui-label">Cargo description</span>
            <textarea
              className="ui-input min-h-20"
              value={description}
              disabled={busy}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="ui-label">Expected date</span>
            <input
              className="ui-input"
              type="date"
              value={expectedAt}
              disabled={busy}
              onChange={(event) => setExpectedAt(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="ui-label">Assign agent (optional)</span>
            <select
              className="ui-input"
              value={assigneeId}
              disabled={busy || agentsQuery.isLoading}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {(agentsQuery.data ?? []).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.full_name ?? agent.email}
                </option>
              ))}
            </select>
          </label>
          {formError ? (
            <p className="ui-alert-danger sm:col-span-2" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create shipment'}
            </Button>
          </div>
        </form>
      </Card>

      {isLoading ? <p className="text-sm text-muted">Loading shipments…</p> : null}
      {error ? (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      ) : null}

      {!isLoading && !error ? (
        <CargoShipmentList
          shipments={shipments}
          isAdmin
          agents={agentsQuery.data ?? []}
          emptyTitle="No cargo shipments yet."
          onAdvance={async (shipment) => {
            await advanceStatus(shipment)
            notifySuccess('Status advanced.')
          }}
          onAssign={async (shipmentId, nextAssignee) => {
            await assignAgent(shipmentId, nextAssignee)
            notifySuccess('Assignee updated.')
          }}
        />
      ) : null}
    </div>
  )
}
