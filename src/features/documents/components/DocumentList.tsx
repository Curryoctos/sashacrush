import { useEffect, useMemo, useRef, useState } from 'react'
import type { Document, DocumentStatus } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { DocumentCard } from '@/features/documents/components/DocumentCard'
import { DocumentPreviewModal } from '@/features/documents/components/DocumentPreviewModal'
import { mimeTypeFromPath } from '@/features/documents/signing'
import { canSendForSigning } from '@/features/documents/validation'
import { useDocuments } from '@/features/documents/useDocuments'
import {
  DOCUMENT_FOLDER_LABELS,
  DOCUMENT_FOLDER_ORDER,
} from '@/features/documents/documentFolders'

interface DocumentListProps {
  landId: string
  statusFilter?: DocumentStatus | null
  highlightDocumentId?: string | null
  onSendForSigning?: (document: Document) => void
  onSigned?: () => void
}

export function DocumentList({
  landId,
  statusFilter = null,
  highlightDocumentId = null,
  onSendForSigning,
  onSigned,
}: DocumentListProps) {
  const { user } = useAuth()
  const { documents, isLoading, error, downloadDocument, getPreviewUrl, signDocument } =
    useDocuments(landId)
  const [signingId, setSigningId] = useState<string | null>(null)
  const [pendingSignDocument, setPendingSignDocument] = useState<Document | null>(null)
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const highlightRef = useRef<HTMLDivElement | null>(null)

  const isStaff = user?.role === 'admin' || user?.role === 'agent'

  const visibleDocuments = useMemo(() => {
    if (!statusFilter) {
      return documents
    }
    return documents.filter((document) => document.status === statusFilter)
  }, [documents, statusFilter])

  useEffect(() => {
    if (highlightDocumentId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightDocumentId, visibleDocuments])

  const grouped = useMemo(() => {
    if (statusFilter) {
      return []
    }

    const buckets = new Map<DocumentStatus, Document[]>()
    for (const status of DOCUMENT_FOLDER_ORDER) {
      buckets.set(status, [])
    }

    for (const document of documents) {
      const list = buckets.get(document.status) ?? []
      list.push(document)
      buckets.set(document.status, list)
    }

    return DOCUMENT_FOLDER_ORDER.map((status) => ({
      status,
      label: DOCUMENT_FOLDER_LABELS[status],
      items: buckets.get(status) ?? [],
    })).filter((group) => group.items.length > 0)
  }, [documents, statusFilter])

  const handleSign = async (document: Document) => {
    setPreviewError(null)
    setSigningId(document.id)
    try {
      await signDocument(document.id)
      setPendingSignDocument(null)
      onSigned?.()
    } catch (signError) {
      setPreviewError(
        signError instanceof Error ? signError.message : 'Signing failed.',
      )
    } finally {
      setSigningId(null)
    }
  }

  const handlePreview = async (document: Document) => {
    setPreviewError(null)
    setIsPreviewLoading(true)

    try {
      const url = await getPreviewUrl(document)
      setPreviewDocument(document)
      setPreviewUrl(url)
    } catch (previewErr) {
      setPreviewError(
        previewErr instanceof Error ? previewErr.message : 'Could not preview document.',
      )
    } finally {
      setIsPreviewLoading(false)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Loading documents…</p>
  }

  const renderCard = (document: Document) => {
    const signableForSend = document.file_path
      ? canSendForSigning(mimeTypeFromPath(document.file_path))
      : false
    const isHighlighted = highlightDocumentId === document.id

    return (
      <div
        key={document.id}
        ref={isHighlighted ? highlightRef : undefined}
        className={isHighlighted ? 'rounded-lg ring-2 ring-brand-500 ring-offset-2' : undefined}
      >
        <DocumentCard
          document={document}
          onPreview={() => void handlePreview(document)}
          onDownload={() => void downloadDocument(document)}
          onSign={() => setPendingSignDocument(document)}
          onSendForSigning={
            isStaff &&
            document.status === 'draft' &&
            signableForSend &&
            onSendForSigning
              ? () => onSendForSigning(document)
              : undefined
          }
          isSigning={signingId === document.id}
          showNotSignableHint={
            isStaff && document.status === 'draft' && !signableForSend
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {(error || previewError) && (
        <p className="ui-alert-danger" role="alert">
          {previewError ??
            (error instanceof Error ? formatSupabaseError(error) : 'Could not load documents.')}
        </p>
      )}

      {isPreviewLoading && <p className="text-sm text-muted">Loading preview…</p>}

      {statusFilter ? (
        visibleDocuments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            No documents in this folder yet.
          </p>
        ) : (
          <div className="space-y-3">{visibleDocuments.map(renderCard)}</div>
        )
      ) : (
        <>
          {documents.length === 0 && (
            <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
              No documents yet.
            </p>
          )}

          {grouped.map((group) => (
            <section key={group.status}>
              <h3 className="mb-3 text-sm font-semibold text-ink">{group.label}</h3>
              <div className="space-y-3">{group.items.map(renderCard)}</div>
            </section>
          ))}
        </>
      )}

      {previewDocument && previewUrl && (
        <DocumentPreviewModal
          title={previewDocument.title ?? 'Document preview'}
          previewUrl={previewUrl}
          filePath={previewDocument.file_path ?? ''}
          onClose={() => {
            setPreviewDocument(null)
            setPreviewUrl(null)
          }}
        />
      )}

      {pendingSignDocument && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sign-modal-title"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-surface-elevated p-6">
            <h2 id="sign-modal-title" className="text-lg font-semibold text-ink">
              Sign this document?
            </h2>
            <p className="mt-2 text-sm text-muted">
              You are about to sign{' '}
              <strong>{pendingSignDocument.title ?? 'this document'}</strong>. This action
              cannot be undone. A signature page will be appended to the file.
            </p>
            <p className="mt-3 text-xs text-muted">
              This is an electronic acknowledgment for deal tracking — not a legally certified
              e-signature.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingSignDocument(null)}
                className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSign(pendingSignDocument)}
                disabled={signingId === pendingSignDocument.id}
                className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
              >
                {signingId === pendingSignDocument.id ? 'Signing…' : 'Confirm & Sign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
