import { useMemo, useState } from 'react'
import type { Document, DocumentStatus } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { DocumentCard } from '@/features/documents/components/DocumentCard'
import { DocumentUpload } from '@/features/documents/components/DocumentUpload'
import { useDocuments } from '@/features/documents/useDocuments'

const GROUP_ORDER: DocumentStatus[] = ['sent', 'signed', 'draft', 'archived']

const GROUP_LABELS: Record<DocumentStatus, string> = {
  sent: 'Awaiting Signature',
  signed: 'Signed',
  draft: 'Draft',
  archived: 'Archived',
}

interface DocumentListProps {
  landId: string
  showUpload?: boolean
  onSendForSigning?: (document: Document) => void
  onSigned?: () => void
}

export function DocumentList({
  landId,
  showUpload = false,
  onSendForSigning,
  onSigned,
}: DocumentListProps) {
  const { user } = useAuth()
  const { documents, isLoading, error, downloadDocument, signDocument, refresh } =
    useDocuments(landId)
  const [signingId, setSigningId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const isStaff = user?.role === 'admin' || user?.role === 'agent'

  const grouped = useMemo(() => {
    const buckets = new Map<DocumentStatus, Document[]>()
    for (const status of GROUP_ORDER) {
      buckets.set(status, [])
    }

    for (const document of documents) {
      const list = buckets.get(document.status) ?? []
      list.push(document)
      buckets.set(document.status, list)
    }

    return GROUP_ORDER.map((status) => ({
      status,
      label: GROUP_LABELS[status],
      items: buckets.get(status) ?? [],
    })).filter((group) => group.items.length > 0)
  }, [documents])

  const handleSign = async (document: Document) => {
    setActionError(null)
    setSigningId(document.id)
    try {
      await signDocument(document.id)
      onSigned?.()
    } catch (signError) {
      setActionError(
        signError instanceof Error ? signError.message : 'Signing failed.',
      )
    } finally {
      setSigningId(null)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Loading documents…</p>
  }

  return (
    <div className="space-y-6">
      {showUpload && isStaff && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-ink">Upload document</h3>
          <DocumentUpload
            landId={landId}
            onUpload={() => {
              void refresh()
            }}
          />
        </section>
      )}

      {(error || actionError) && (
        <p className="text-sm text-red-700" role="alert">
          {actionError ??
            (error instanceof Error ? formatSupabaseError(error) : 'Could not load documents.')}
        </p>
      )}

      {documents.length === 0 && (
        <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-muted">
          No documents yet.
        </p>
      )}

      {grouped.map((group) => (
        <section key={group.status}>
          <h3 className="mb-3 text-sm font-semibold text-ink">{group.label}</h3>
          <div className="space-y-3">
            {group.items.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onDownload={() => void downloadDocument(document)}
                onSign={() => void handleSign(document)}
                onSendForSigning={
                  isStaff && document.status === 'draft' && onSendForSigning
                    ? () => onSendForSigning(document)
                    : undefined
                }
                isSigning={signingId === document.id}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
