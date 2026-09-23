import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
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

  const [showCreate, setShowCreate] = useState(false)
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
      setShowCreate(false)
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
      <div>
        <PageBackLink to="/admin/pipeline" label="Pipeline" />
        <PageHeader
          className="mt-3"
          eyebrow="CurryOctos"
          title="Cargo & imports"
          description={
            user?.email
              ? `Signed in as ${user.email}. Track China→USA machine shipments and collaborator approvals.`
              : 'Track China→USA machine shipments and collaborator approvals.'
          }
          actions={
            <Button type="button" onClick={() => setShowCreate((open) => !open)}>
              {showCreate ? 'Close' : 'New shipment'}
            </Button>
          }
        />
      </div>

      {showCreate ? (
        <Card>
          <CardHeader
            title="New shipment"
            description="Origin, destination, cargo description, and expected arrival."
          />
          <form className="space-y-5" onSubmit={(event) => void onCreate(event)}>
            <div className="ui-field-row">
              <div className="ui-field">
                <label htmlFor="cargo-origin" className="ui-label">
                  Origin
                </label>
                <input
                  id="cargo-origin"
                  className="ui-input"
                  value={origin}
                  disabled={busy}
                  onChange={(event) => setOrigin(event.target.value)}
                  required
                />
              </div>
              <div className="ui-field">
                <label htmlFor="cargo-destination" className="ui-label">
                  Destination
                </label>
                <input
                  id="cargo-destination"
                  className="ui-input"
                  value={destination}
                  disabled={busy}
                  onChange={(event) => setDestination(event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="ui-field">
              <label htmlFor="cargo-description" className="ui-label">
                Cargo description
              </label>
              <textarea
                id="cargo-description"
                className="ui-input"
                value={description}
                disabled={busy}
                onChange={(event) => setDescription(event.target.value)}
                required
                placeholder="Machine type, quantity, packing notes…"
              />
            </div>
            <div className="ui-field-row">
              <div className="ui-field">
                <label htmlFor="cargo-expected" className="ui-label">
                  Expected date
                </label>
                <input
                  id="cargo-expected"
                  className="ui-input"
                  type="date"
                  value={expectedAt}
                  disabled={busy}
                  onChange={(event) => setExpectedAt(event.target.value)}
                  required
                />
              </div>
              <div className="ui-field">
                <label htmlFor="cargo-assignee" className="ui-label">
                  Assign agent
                </label>
                <select
                  id="cargo-assignee"
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
                <p className="ui-hint">Optional — agent can approve stages and upload docs.</p>
              </div>
            </div>
            {formError ? (
              <p className="ui-alert-danger" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="flex justify-end border-t border-border/80 pt-4">
              <Button type="submit" disabled={busy} size="lg">
                {busy ? 'Creating…' : 'Create shipment'}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

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
          emptyTitle={
            showCreate
              ? 'No cargo shipments yet.'
              : 'No cargo shipments yet — click New shipment to create one.'
          }
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
