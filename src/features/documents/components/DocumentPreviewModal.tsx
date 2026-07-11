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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="preview-modal-title" className="text-lg font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-ink hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="min-h-[50vh] flex-1 overflow-auto p-4">
          {isPdf && (
            <iframe
              src={previewUrl}
              title={title}
              className="h-[70vh] w-full rounded-lg border border-slate-200"
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
            <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-muted">
              In-browser preview is not available for this file type. Use Download instead.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
