import { useEffect, useState } from 'react'
import { readGeolocation, usePhotos } from '@/features/photos/usePhotos'
import { notifySuccess } from '@/features/notifications/useNotifications'
import { SellerLandSelector } from '@/features/seller/components/SellerLandSelector'
import { useSellerLands } from '@/features/seller/useSellerLands'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function SellerPhotosPage() {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const {
    lands,
    selectedLand,
    selectedLandId,
    setSelectedLandId,
    isLoading: landsLoading,
    error: landsError,
  } = useSellerLands()

  const { photos, isLoading, error, uploadPhoto, getPhotoUrl } = usePhotos(
    selectedLandId || null,
  )

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedLandId) {
      return
    }

    setUploading(true)
    setActionError(null)

    try {
      const coords = await readGeolocation()
      await uploadPhoto(file, selectedLandId, coords)
      notifySuccess('Photo uploaded successfully.')
      event.target.value = ''
    } catch (uploadError) {
      setActionError(
        uploadError instanceof Error ? uploadError.message : 'Upload failed.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-ink">Property Photos</h1>
          <p className="mt-1 text-sm text-muted">Signed in as {user?.email}</p>
          {selectedLand?.title && (
            <p className="mt-1 text-sm text-muted">Property: {selectedLand.title}</p>
          )}

          {lands.length > 1 && (
            <div className="mt-6">
              <SellerLandSelector
                lands={lands}
                selectedLandId={selectedLandId}
                onSelect={setSelectedLandId}
              />
            </div>
          )}

          {selectedLandId && (
            <div className="mt-6">
              <label
                htmlFor="seller-photo-upload"
                className="inline-flex cursor-pointer rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                {uploading ? 'Uploading…' : 'Upload photo'}
              </label>
              <input
                id="seller-photo-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                capture="environment"
                className="sr-only"
                disabled={uploading}
                onChange={(event) => void handleUpload(event)}
              />
            </div>
          )}
        </div>

        {(landsError || error || actionError) && (
          <p className="text-sm text-red-700" role="alert">
            {actionError ??
              (landsError instanceof Error
                ? formatSupabaseError(landsError)
                : error instanceof Error
                  ? formatSupabaseError(error)
                  : 'Could not load photos.')}
          </p>
        )}

        {(landsLoading || isLoading) && (
          <p className="text-sm text-muted">Loading photos…</p>
        )}

        {!landsLoading && !selectedLandId && (
          <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-muted">
            No land record assigned yet.
          </p>
        )}

        {photos.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} getPhotoUrl={getPhotoUrl} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PhotoCard({
  photo,
  getPhotoUrl,
}: {
  photo: {
    id: string
    file_path: string | null
    latitude: number | null
    longitude: number | null
    captured_at: string
  }
  getPhotoUrl: (path: string) => Promise<string>
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!photo.file_path) {
      return
    }

    void getPhotoUrl(photo.file_path).then(setUrl).catch(() => setUrl(null))
  }, [photo.file_path, getPhotoUrl])

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {url ? (
        <img src={url} alt="Property photo" className="h-48 w-full object-cover" />
      ) : (
        <div className="flex h-48 items-center justify-center bg-slate-100 text-sm text-muted">
          Loading…
        </div>
      )}
      <div className="p-4 text-xs text-muted">
        <p>{new Date(photo.captured_at).toLocaleString()}</p>
        {photo.latitude != null && photo.longitude != null && (
          <p className="mt-1">
            GPS: {photo.latitude.toFixed(5)}, {photo.longitude.toFixed(5)}
          </p>
        )}
      </div>
    </article>
  )
}
