import { useState, type FormEvent } from 'react'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/PageHeader'
import {
  useCargoApprovals,
  useCargoDocuments,
} from '@/features/cargo/useCargo'
import { adminNextCargoStatus } from '@/features/cargo/validation'
import { formatDate, formatDateTime } from '@/lib/formatters'
import {
  CARGO_STATUS_LABEL,
  type CargoShipmentWithMeta,
  type CargoStatus,
} from '@/types/cargo'

interface AgentOption {
  id: string
  full_name: string | null
  email: string
}

interface CargoShipmentListProps {
  shipments: CargoShipmentWithMeta[]
  isAdmin?: boolean
  userId?: string
  agents?: AgentOption[]
  emptyTitle?: string
  onAdvance?: (shipment: CargoShipmentWithMeta) => Promise<void>
  onAssign?: (shipmentId: string, assigneeId: string | null) => Promise<void>
  onApprove?: (shipment: CargoShipmentWithMeta, note?: string) => Promise<void>
}

export function CargoShipmentList({
  shipments,
  isAdmin,
  userId,
  agents = [],
  emptyTitle = 'No shipments yet.',
  onAdvance,
  onAssign,
  onApprove,
}: CargoShipmentListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (shipments.length === 0) {
    return <EmptyState title={emptyTitle} />
  }

  return (
    <div className="space-y-3">
      {shipments.map((shipment) => {
        const expanded = expandedId === shipment.id
        return (
          <Card key={shipment.id} padding="sm">
            <button
              type="button"
              className="flex w-full flex-wrap items-start justify-between gap-3 text-left"
              onClick={() => setExpandedId(expanded ? null : shipment.id)}
            >
              <div>
                <p className="font-medium text-ink">
                  {shipment.origin} → {shipment.destination}
                </p>
                <p className="mt-1 text-sm text-muted">
                  Expected {formatDate(shipment.expected_at)}
                  {shipment.assignee_name || shipment.assignee_email
                    ? ` · ${shipment.assignee_name ?? shipment.assignee_email}`
                    : ' · Unassigned'}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-ink">{shipment.description}</p>
              </div>
              <Badge
                tone={
                  shipment.status === 'delivered'
                    ? 'success'
                    : shipment.status === 'ordered'
                      ? 'warning'
                      : statusTone(shipment.status)
                }
              >
                {CARGO_STATUS_LABEL[shipment.status]}
              </Badge>
            </button>

            {expanded ? (
              <ShipmentDetail
                shipment={shipment}
                isAdmin={isAdmin}
                userId={userId}
                agents={agents}
                onAdvance={onAdvance}
                onAssign={onAssign}
                onApprove={onApprove}
              />
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}

function ShipmentDetail({
  shipment,
  isAdmin,
  userId,
  agents,
  onAdvance,
  onAssign,
  onApprove,
}: {
  shipment: CargoShipmentWithMeta
  isAdmin?: boolean
  userId?: string
  agents: AgentOption[]
  onAdvance?: CargoShipmentListProps['onAdvance']
  onAssign?: CargoShipmentListProps['onAssign']
  onApprove?: CargoShipmentListProps['onApprove']
}) {
  const docs = useCargoDocuments(shipment.id)
  const approvals = useCargoApprovals(shipment.id)
  const next = adminNextCargoStatus(shipment.status)
  const alreadyApproved = shipment.approved_stages.includes(shipment.status)
  const canApprove =
    !isAdmin && userId && shipment.assignee_id === userId && !alreadyApproved && onApprove

  const [note, setNote] = useState('')
  const [docTitle, setDocTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      {isAdmin && onAssign ? (
        <label className="block max-w-sm space-y-1.5">
          <span className="ui-label">Assigned collaborator</span>
          <select
            className="ui-input"
            value={shipment.assignee_id ?? ''}
            disabled={busy}
            onChange={(event) => {
              void run(() => onAssign(shipment.id, event.target.value || null))
            }}
          >
            <option value="">Unassigned</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.full_name ?? agent.email}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {isAdmin && next && onAdvance ? (
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void run(() => onAdvance(shipment))}
        >
          Advance to {CARGO_STATUS_LABEL[next]}
        </Button>
      ) : null}

      {canApprove ? (
        <Card padding="sm">
          <CardHeader
            title={`Approve ${CARGO_STATUS_LABEL[shipment.status]}`}
            description="Logs your identity and timestamp for this stage."
          />
          <label className="block space-y-1.5">
            <span className="ui-label">Note (optional)</span>
            <textarea
              className="ui-input min-h-16"
              value={note}
              disabled={busy}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <Button
            type="button"
            className="mt-3"
            disabled={busy}
            onClick={() => void run(async () => {
              await onApprove(shipment, note)
              setNote('')
            })}
          >
            Approve stage
          </Button>
        </Card>
      ) : null}

      {alreadyApproved && !isAdmin ? (
        <p className="text-sm text-muted">
          You already approved the {CARGO_STATUS_LABEL[shipment.status]} stage.
        </p>
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Stage approvals
        </p>
        {(approvals.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted">No approvals logged yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {(approvals.data ?? []).map((entry) => (
              <li key={entry.id}>
                {CARGO_STATUS_LABEL[entry.stage as CargoStatus]} ·{' '}
                {formatDateTime(entry.created_at)}
                {entry.note ? ` — ${entry.note}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Documents
        </p>
        {(docs.documents ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted">No documents attached.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {docs.documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{doc.title}</span>
                {doc.signed_url ? (
                  <a className="text-brand-800 underline" href={doc.signed_url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <form
          className="mt-3 space-y-2"
          onSubmit={(event: FormEvent) => {
            event.preventDefault()
            if (!file) {
              setError('Choose a file.')
              return
            }
            void run(async () => {
              await docs.uploadDocument({
                shipmentId: shipment.id,
                title: docTitle || file.name,
                file,
              })
              setDocTitle('')
              setFile(null)
            })
          }}
        >
          <label className="block space-y-1.5">
            <span className="ui-label">Attach document</span>
            <input
              className="ui-input"
              value={docTitle}
              disabled={busy}
              onChange={(event) => setDocTitle(event.target.value)}
              placeholder="Title"
            />
          </label>
          <input
            className="ui-input"
            type="file"
            accept=".pdf,.doc,.docx,image/*"
            disabled={busy}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <Button type="submit" size="sm" disabled={busy || !file}>
            Upload
          </Button>
        </form>
      </div>

      {error ? (
        <p className="ui-alert-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
