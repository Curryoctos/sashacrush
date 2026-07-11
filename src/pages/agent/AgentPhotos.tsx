import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { readGeolocation, usePhotos } from '@/features/photos/usePhotos'
import { notifySuccess } from '@/features/notifications/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types'

const LAND_COLUMNS = 'id, title, location'

export function AgentPhotosPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const landFromQuery = searchParams.get('land')
  const [selectedLandId, setSelectedLandId] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const landsQuery = useQuery({
    queryKey: ['land-records', 'agent-photos'],
    queryFn: async (): Promise<LandRecord[]> => {
      const { data, error } = await supabase
        .from('land_records')
        .select(LAND_COLUMNS)
        .eq('status', 'active')
        .order('title')

      if (error) {
        throw error
      }

      return (data ?? []) as LandRecord[]
    },
  })

  useEffect(() => {
    if (!landFromQuery || !landsQuery.data?.length) {
      return
    }

    if (landsQuery.data.some((land) => land.id === landFromQuery)) {
      setSelectedLandId(landFromQuery)
    }
  }, [landFromQuery, landsQuery.data])

  const activeLandId = selectedLandId || landsQuery.data?.[0]?.id || ''
  const { photos, isLoading, error, uploadPhoto, getPhotoUrl } = usePhotos(
    activeLandId || null,
  )

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !activeLandId) {
      return
    }

    setUploading(true)
    setActionError(null)

    try {
      const coords = await readGeolocation()
      await uploadPhoto(file, activeLandId, coords)
      notifySuccess('Photo uploaded with GPS coordinates.')
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
          <h1 className="text-2xl font-semibold text-ink">Field Photos</h1>
          <p className="mt-1 text-sm text-muted">
            Signed in as {user?.email}. GPS coordinates are captured when available.
          </p>

          <div className="mt-6">
            <label htmlFor="land-select" className="block text-sm font-medium text-ink">
              Land record
            </label>
            <select
              id="land-select"
              value={activeLandId}
              onChange={(event) => setSelectedLandId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {(landsQuery.data ?? []).map((land) => (
                <option key={land.id} value={land.id}>
                  {land.title}
                </option>
              ))}
            </select>
          </div>

          {activeLandId && (
            <div className="mt-6">
              <label
                htmlFor="photo-upload"
                className="inline-flex cursor-pointer rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                {uploading ? 'Uploading…' : 'Capture / upload photo'}
              </label>
              <input
                id="photo-upload"
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

        {(error || actionError) && (
          <p className="text-sm text-red-700" role="alert">
            {actionError ??
              (error instanceof Error ? formatSupabaseError(error) : 'Could not load photos.')}
          </p>
        )}

        {isLoading && <p className="text-sm text-muted">Loading photos…</p>}

        {!isLoading && photos.length === 0 && activeLandId && (
          <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-muted">
            No field photos yet for this property.
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
        <img src={url} alt="Field capture" className="h-48 w-full object-cover" />
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
