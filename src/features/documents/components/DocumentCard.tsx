import type { Document, DocumentStatus } from '@/types'
import { useAuth } from '@/hooks/useAuth'

const STATUS_BADGE: Record<
  DocumentStatus,
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
  sent: { label: 'Awaiting Signature', className: 'bg-blue-100 text-blue-800' },
  signed: { label: 'Signed ✓', className: 'bg-green-100 text-green-800' },
  archived: { label: 'Archived', className: 'bg-slate-100 text-slate-600' },
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

interface DocumentCardProps {
  document: Document
  onSign?: () => void
  onDownload: () => void
  onPreview?: () => void
  onSendForSigning?: () => void
  isSigning?: boolean
  showNotSignableHint?: boolean
}

export function DocumentCard({
  document,
  onSign,
  onDownload,
  onPreview,
  onSendForSigning,
  isSigning = false,
  showNotSignableHint = false,
}: DocumentCardProps) {
  const { user } = useAuth()
  const badge = STATUS_BADGE[document.status]
  const fileName = document.title ?? document.file_path ?? 'Untitled document'
  const canSign =
    document.status === 'sent' &&
    user?.id === document.assigned_to &&
    Boolean(onSign)

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {document.status === 'signed' && (
              <span className="text-muted" title="Signed and locked" aria-hidden>
                🔒
              </span>
            )}
            <h3 className="truncate text-sm font-semibold text-ink">{fileName}</h3>
          </div>
          <p className="mt-1 text-xs text-muted">
            Uploaded {formatTimestamp(document.created_at)}
          </p>
          {document.signed_at && (
            <p className="mt-0.5 text-xs text-muted">
              Signed {formatTimestamp(document.signed_at)}
            </p>
          )}
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {onPreview && (
          <button
            type="button"
            onClick={onPreview}
            className="rounded-lg border border-brand-600 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
          >
            Preview
          </button>
        )}
        <button
          type="button"
          onClick={onDownload}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50"
        >
          Download
        </button>

        {canSign && (
          <button
            type="button"
            onClick={onSign}
            disabled={isSigning}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {isSigning ? 'Signing…' : 'Sign'}
          </button>
        )}

        {document.status === 'draft' && onSendForSigning && (
          <button
            type="button"
            onClick={onSendForSigning}
            className="rounded-lg border border-brand-600 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
          >
            Send for Signing
          </button>
        )}

        {showNotSignableHint && (
          <p className="w-full text-xs text-amber-700">
            DOCX files must be converted to PDF before sending for signature.
          </p>
        )}
      </div>
    </article>
  )
}
