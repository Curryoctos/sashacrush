import { Download, Eye, FileSignature, Send } from 'lucide-react'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import {
  DOCUMENT_PIPELINE_ORDER,
  DOCUMENT_STAGE_LABELS,
  allowedStageTargets,
} from '@/features/documents/documentStages'
import type { Document, DocumentStatus } from '@/types'

interface DocumentDetailDrawerProps {
  document: Document | null
  landTitle?: string
  canEditStages: boolean
  busy?: boolean
  isSigning?: boolean
  onClose: () => void
  onStageChange: (status: DocumentStatus) => void
  onPreview?: () => void
  onDownload?: () => void
  onSendForSigning?: () => void
  onSign?: () => void
}

function formatWhen(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function DocumentDetailDrawer({
  document,
  landTitle,
  canEditStages,
  busy = false,
  isSigning = false,
  onClose,
  onStageChange,
  onPreview,
  onDownload,
  onSendForSigning,
  onSign,
}: DocumentDetailDrawerProps) {
  if (!document) {
    return null
  }

  const title = document.title ?? document.file_path ?? 'Untitled document'
  const targets = allowedStageTargets(document.status)
  const showSend =
    canEditStages && document.status === 'draft' && Boolean(onSendForSigning)
  const showSign = document.status === 'sent' && Boolean(onSign)
  const disabled = busy || isSigning

  return (
    <Drawer
      open
      title={title}
      description={landTitle ? `Deal · ${landTitle}` : undefined}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          {onPreview ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onPreview}
              disabled={disabled}
            >
              <Eye className="h-4 w-4" aria-hidden />
              Preview
            </Button>
          ) : null}
          {onDownload ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onDownload}
              disabled={disabled}
            >
              <Download className="h-4 w-4" aria-hidden />
              Download
            </Button>
          ) : null}
          {showSend ? (
            <Button type="button" size="sm" onClick={onSendForSigning} disabled={disabled}>
              <Send className="h-4 w-4" aria-hidden />
              Send for signing
            </Button>
          ) : null}
          {showSign ? (
            <Button type="button" size="sm" onClick={onSign} disabled={disabled}>
              <FileSignature className="h-4 w-4" aria-hidden />
              {isSigning ? 'Signing…' : 'Sign document'}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Pipeline stage
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {DOCUMENT_PIPELINE_ORDER.map((status) => {
              const active = document.status === status
              return (
                <span
                  key={status}
                  className={
                    active
                      ? 'rounded-md bg-brand-700 px-2.5 py-1 text-xs font-medium text-white'
                      : 'rounded-md border border-border bg-white px-2.5 py-1 text-xs text-muted'
                  }
                >
                  {DOCUMENT_STAGE_LABELS[status]}
                </span>
              )
            })}
          </div>
          <div className="mt-3">
            <Badge tone={statusTone(document.status)}>
              Current · {DOCUMENT_STAGE_LABELS[document.status]}
            </Badge>
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Stage controls
          </h3>
          {canEditStages && document.status !== 'signed' ? (
            <label className="mt-3 block">
              <span className="ui-label">Move to</span>
              <select
                className="ui-input mt-1"
                aria-label="Change document stage"
                value={document.status}
                disabled={disabled}
                onChange={(event) =>
                  onStageChange(event.target.value as DocumentStatus)
                }
              >
                {targets.map((status) => (
                  <option key={status} value={status}>
                    {DOCUMENT_STAGE_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mt-3 text-sm text-muted">
              {document.status === 'signed'
                ? 'Signed documents are locked.'
                : showSign
                  ? 'Review the file, then sign when ready.'
                  : 'You can review this document but cannot change its stage.'}
            </p>
          )}
        </section>

        <section className="space-y-2 text-sm">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Details
          </h3>
          <p>
            <span className="text-muted">Uploaded · </span>
            {formatWhen(document.created_at)}
          </p>
          {document.signed_at ? (
            <p>
              <span className="text-muted">Signed · </span>
              {formatWhen(document.signed_at)}
            </p>
          ) : null}
          {document.signature_hash ? (
            <p className="break-all text-xs text-muted">
              Hash · {document.signature_hash}
            </p>
          ) : null}
        </section>
      </div>
    </Drawer>
  )
}
