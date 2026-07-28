import {
  Download,
  Eye,
  FileSignature,
  Lock,
  Send,
} from 'lucide-react'
import type { Document, DocumentStatus } from '@/types'
import { Badge, statusTone } from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { IconActionButton } from '@/components/ui/IconActionButton'

const STATUS_LABEL: Record<DocumentStatus, string> = {
  draft: 'Draft',
  sent: 'Awaiting Signature',
  signed: 'Signed',
  archived: 'Archived',
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
  const fileName = document.title ?? document.file_path ?? 'Untitled document'
  const canSign =
    document.status === 'sent' &&
    user?.id === document.assigned_to &&
    Boolean(onSign)

  return (
    <article className="rounded-lg border border-border bg-surface-elevated p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {document.status === 'signed' && (
              <Lock className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
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
        <Badge tone={statusTone(document.status)}>{STATUS_LABEL[document.status]}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {onPreview && (
          <IconActionButton
            label="Preview"
            icon={<Eye className="h-4 w-4" />}
            onClick={onPreview}
          />
        )}
        <IconActionButton
          label="Download"
          icon={<Download className="h-4 w-4" />}
          onClick={onDownload}
        />

        {canSign && (
          <IconActionButton
            label={isSigning ? 'Signing…' : 'Sign'}
            icon={<FileSignature className="h-4 w-4" />}
            variant="primary"
            onClick={onSign}
            disabled={isSigning}
          />
        )}

        {document.status === 'draft' && onSendForSigning && (
          <IconActionButton
            label="Send for signing"
            icon={<Send className="h-4 w-4" />}
            onClick={onSendForSigning}
          />
        )}

        {showNotSignableHint && (
          <p className="ui-alert-warning w-full">
            DOCX files must be converted to PDF before sending for signature.
          </p>
        )}
      </div>
    </article>
  )
}
