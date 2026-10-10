import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/PageHeader'
import { compressImageFile } from '@/features/photos/captureImage'
import { usePhotos } from '@/features/photos/usePhotos'
import { formatDate } from '@/lib/formatters'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { PHOTO_MIME_TYPES } from '@/types/photos'

interface ProjectPhotosPanelProps {
  projectId: string
}

export function ProjectPhotosPanel({ projectId }: ProjectPhotosPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const { photos, isLoading, error, uploadPhoto, getPhotoUrl, setActionError } =
    usePhotos({ projectId })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next: Record<string, string> = {}
      for (const photo of photos) {
        if (!photo.file_path) continue
        try {
          next[photo.id] = await getPhotoUrl(photo.file_path)
        } catch {
          // ignore signed URL failures per row
        }
      }
      if (!cancelled) setPreviewUrls(next)
    })()
    return () => {
      cancelled = true
    }
  }, [getPhotoUrl, photos])

  const onUpload = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    setActionError(null)
    try {
      if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
        throw new Error('Only PNG, JPG, and WebP images are accepted.')
      }
      const compressed = await compressImageFile(file)
      await uploadPhoto(compressed, { projectId })
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not upload photo.',
      )
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          Progress and site photos attached to this project.
        </p>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept={PHOTO_MIME_TYPES.join(',')}
            className="hidden"
            onChange={(event) => void onUpload(event.target.files?.[0] ?? null)}
          />
          <Button
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Upload photo'}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="ui-alert-danger" role="alert">
          {error instanceof Error ? formatSupabaseError(error) : String(error)}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-[13px] text-muted">Loading photos…</p>
      ) : photos.length === 0 ? (
        <EmptyState
          title="No project photos yet"
          description="Upload site or progress photos for this project."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <figure
              key={photo.id}
              className="overflow-hidden rounded-lg border border-border bg-surface"
            >
              {previewUrls[photo.id] ? (
                <img
                  src={previewUrls[photo.id]}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="ui-skeleton aspect-square" />
              )}
              <figcaption className="px-2 py-1.5 text-[11px] text-muted">
                {formatDate(photo.captured_at)}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}
