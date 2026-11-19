import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/PageHeader'
import { Badge, statusTone } from '@/components/ui/Badge'
import { useDocuments } from '@/features/documents/useDocuments'
import { formatDate } from '@/lib/formatters'
import { formatSupabaseError } from '@/lib/supabase-errors'

interface ProjectDocumentsPanelProps {
  projectId: string
}

export function ProjectDocumentsPanel({ projectId }: ProjectDocumentsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const { documents, isLoading, error, uploadDocument } = useDocuments(projectId, {
    scope: 'project',
  })

  const onUpload = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    try {
      await uploadDocument(file, projectId)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          Documents attached to this project (signing still uses deal or investor packs when needed).
        </p>
        <div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(event) => void onUpload(event.target.files?.[0] ?? null)}
          />
          <Button
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Upload document'}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="ui-alert-danger" role="alert">
          {error instanceof Error ? formatSupabaseError(error) : String(error)}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-[13px] text-muted">Loading documents…</p>
      ) : documents.length === 0 ? (
        <EmptyState
          title="No project documents yet"
          description="Upload contracts, receipts packs, or site paperwork for this project."
        />
      ) : (
        <ul className="ui-panel divide-y divide-border overflow-hidden">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">
                  {doc.title ?? 'Untitled'}
                </p>
                <p className="text-[11px] text-muted">
                  {formatDate(doc.created_at)}
                </p>
              </div>
              <Badge tone={statusTone(doc.status)}>{doc.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
