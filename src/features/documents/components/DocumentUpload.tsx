import { useCallback, useRef, useState, type DragEvent } from 'react'
import type { Document } from '@/types'
import { FILE_SIZE_ERROR, FILE_TYPE_ERROR, UPLOAD_FAILED_ERROR } from '@/types/documents'
import { useDocuments } from '@/features/documents/useDocuments'
import { validateFileSize, validateFileType } from '@/features/documents/validation'

interface DocumentUploadProps {
  landId: string
  onUpload: (doc: Document) => void
}

export function DocumentUpload({ landId, onUpload }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { uploadDocument } = useDocuments(landId)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)

      if (!validateFileType(file.type)) {
        setError(FILE_TYPE_ERROR)
        return
      }

      if (!validateFileSize(file.size)) {
        setError(FILE_SIZE_ERROR)
        return
      }

      setIsUploading(true)
      setProgress(0)

      try {
        const document = await uploadDocument(file, landId, setProgress)
        onUpload(document)
        setProgress(null)
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : UPLOAD_FAILED_ERROR
        setError(message)
        setProgress(null)
      } finally {
        setIsUploading(false)
      }
    },
    [landId, onUpload, uploadDocument],
  )

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragging(false)
      const file = event.dataTransfer.files[0]
      if (file) {
        void handleFile(file)
      }
    },
    [handleFile],
  )

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            inputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-brand-600 bg-brand-50'
            : 'border-border bg-surface hover:border-brand-500'
        }`}
      >
        <p className="text-sm font-medium text-ink">
          Drag and drop a file here, or click to select
        </p>
        <p className="mt-2 text-xs text-muted">
          Accepted formats: PDF, DOCX, PNG, JPG (max 50MB)
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              void handleFile(file)
            }
            event.target.value = ''
          }}
        />
      </div>

      {progress !== null && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-brand-700 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted">{isUploading ? 'Uploading…' : 'Done'}</p>
        </div>
      )}

      {error && (
        <p className="ui-alert-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
