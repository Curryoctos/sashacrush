import { Button } from '@/components/ui/Button'
import { mimeTypeFromPath } from '@/features/documents/signing'

interface DocumentPreviewModalProps {
  title: string
  previewUrl: string
  filePath: string
  onClose: () => void
}

export function DocumentPreviewModal({
  title,
  previewUrl,
  filePath,
  onClose,
}: DocumentPreviewModalProps) {
  const mimeType = mimeTypeFromPath(filePath)
  const isPdf = mimeType === 'application/pdf'
  const isImage = mimeType.startsWith('image/')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div className="ui-panel flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="preview-modal-title" className="text-lg font-semibold text-ink">
            {title}
          </h2>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="min-h-[50vh] flex-1 overflow-auto p-4">
          {isPdf && (
            <iframe
              src={previewUrl}
              title={title}
              className="h-[70vh] w-full rounded-lg border border-border"
            />
          )}

          {isImage && (
            <img
              src={previewUrl}
              alt={title}
              className="mx-auto max-h-[70vh] max-w-full rounded-lg"
            />
          )}

          {!isPdf && !isImage && (
            <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
              In-browser preview is not available for this file type. Use Download instead.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
