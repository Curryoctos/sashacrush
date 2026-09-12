import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Camera, MapPin, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/PageHeader'
import { IconActionButton } from '@/components/ui/IconActionButton'
import {
  DealCards,
  FolderCards,
  HierarchyNav,
} from '@/components/hierarchy/Hierarchy'
import { useLandHierarchyNav } from '@/hooks/useLandHierarchyNav'
import {
  getLastKnownGeolocation,
  isAccurateFix,
  NULL_COORDS,
  startGeolocationWarmup,
} from '@/features/photos/geolocation'
import { usePhotos } from '@/features/photos/usePhotos'
import { notifySuccess } from '@/features/notifications/useNotifications'
import { LandMapPanel } from '@/features/maps/components/LandMapPanel'
import { PhotoDetailDrawer } from '@/features/photos/components/PhotoDetailDrawer'
import { formatSupabaseError } from '@/lib/supabase-errors'
import type { LandPhoto } from '@/types/photos'

interface LandOption {
  id: string
  title: string
}

interface PhotosBrowserProps {
  lands: LandOption[]
  isLoadingLands?: boolean
  landsError?: Error | null
  canUpload?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export function PhotosBrowser({
  lands,
  isLoadingLands = false,
  landsError = null,
  canUpload = true,
  emptyTitle = 'No land deals yet',
  emptyDescription = 'Photos are organized by land deal.',
}: PhotosBrowserProps) {
  const { searchParams, setSearchParams, selectedLandId, selectedLand, selectedFolder, setNavigation } =
    useLandHierarchyNav(lands)
  const [uploading, setUploading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})

  const { photos, isLoading, error, uploadPhoto, refinePhotoGps, getPhotoUrl } =
    usePhotos(selectedLandId)

  useEffect(() => {
    setSelectedPhotoId(null)
  }, [selectedLandId, selectedFolder])

  useEffect(() => {
    if (!canUpload || !selectedLandId) {
      return
    }
    return startGeolocationWarmup()
  }, [canUpload, selectedLandId])

  useEffect(() => {
    return () => {
      for (const url of Object.values(previewUrls)) {
        URL.revokeObjectURL(url)
      }
    }
    // Revoke only on unmount; urls are moved/replaced carefully during upload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const optimisticPhotos = useMemo<LandPhoto[]>(
    () =>
      Object.keys(previewUrls)
        .filter((id) => id.startsWith('local-'))
        .map((id) => ({
          id,
          land_id: selectedLandId ?? '',
          uploader_id: '',
          file_path: null,
          latitude: null,
          longitude: null,
          captured_at: new Date().toISOString(),
        })),
    [previewUrls, selectedLandId],
  )

  const displayPhotos = useMemo(
    () => [...optimisticPhotos, ...photos],
    [optimisticPhotos, photos],
  )

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedLandId) {
      return
    }

    const landId = selectedLandId
    const previewUrl = URL.createObjectURL(file)
    const tempId = `local-${crypto.randomUUID()}`

    setActionError(null)
    setPreviewUrls((current) => ({ ...current, [tempId]: previewUrl }))
    setSelectedPhotoId(tempId)
    if (selectedFolder !== 'gallery') {
      setNavigation(landId, 'gallery')
    }
    setUploading(true)
    event.target.value = ''

    try {
      const seedCoords = getLastKnownGeolocation() ?? NULL_COORDS
      const photo = await uploadPhoto(file, landId, seedCoords)

      setPreviewUrls((current) => {
        const next = { ...current }
        delete next[tempId]
        next[photo.id] = previewUrl
        return next
      })
      setSelectedPhotoId(photo.id)
      notifySuccess('Photo uploaded.')
      setUploading(false)

      void refinePhotoGps(photo.id, landId).then((coords) => {
        if (coords.latitude == null || coords.longitude == null) {
          return
        }
        const meters =
          coords.accuracyM != null ? ` (±${Math.round(coords.accuracyM)}m)` : ''
        if (isAccurateFix(coords)) {
          notifySuccess(`GPS attached${meters}.`)
        } else {
          notifySuccess(`GPS attached with a coarse fix${meters}.`)
        }
      })
    } catch (uploadError) {
      setPreviewUrls((current) => {
        const next = { ...current }
        const removed = next[tempId]
        delete next[tempId]
        if (removed) {
          URL.revokeObjectURL(removed)
        }
        return next
      })
      setSelectedPhotoId(null)
      setActionError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
      setUploading(false)
    }
  }

  if (isLoadingLands) {
    return <p className="text-sm text-muted">Loading deals…</p>
  }

  if (landsError) {
    return (
      <p className="ui-alert-danger" role="alert">
        {formatSupabaseError(landsError)}
      </p>
    )
  }

  if (!selectedLand) {
    return (
      <DealCards
        deals={lands.map((land) => ({ id: land.id, title: land.title, hint: 'Open folders' }))}
        onSelect={(id) => setNavigation(id, null)}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        prompt="Select a deal to browse photos."
      />
    )
  }

  if (selectedFolder === 'map') {
    return (
      <div className="space-y-5">
        <HierarchyNav
          crumbs={[
            { label: 'All deals', onClick: () => setNavigation(null, null) },
            {
              label: selectedLand.title,
              onClick: () => setNavigation(selectedLand.id, null),
            },
            { label: 'Map' },
          ]}
        />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="ui-section-title">Photo map</h2>
            <p className="ui-section-desc">Geotagged captures on the parcel map</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setNavigation(selectedLand.id, null)}
          >
            <ArrowLeft className="h-4 w-4" />
            Folders
          </Button>
        </div>
        <LandMapPanel
          landId={selectedLand.id}
          title="Field photo overlay"
          description="Click a pin to open the photo. Red pins sit outside the parcel."
          highlightPhotoId={searchParams.get('photo')}
          onPhotoFocus={(photoId) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              if (photoId) {
                next.set('photo', photoId)
              } else {
                next.delete('photo')
              }
              return next
            })
          }}
        />
      </div>
    )
  }

  if (selectedFolder !== 'gallery') {
    return (
      <div className="space-y-5">
        <HierarchyNav
          crumbs={[
            { label: 'All deals', onClick: () => setNavigation(null, null) },
            { label: selectedLand.title },
          ]}
        />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="ui-section-title">{selectedLand.title}</h2>
            <p className="ui-section-desc">Choose a folder</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setNavigation(null, null)}>
              <ArrowLeft className="h-4 w-4" />
              All deals
            </Button>
            {canUpload && (
              <label className="inline-flex">
                <IconActionButton
                  label={uploading ? 'Uploading…' : 'Upload photo'}
                  icon={<Upload className="h-4 w-4" />}
                  variant="primary"
                  disabled={uploading}
                  onClick={() => document.getElementById('hierarchy-photo-upload')?.click()}
                />
                <input
                  id="hierarchy-photo-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  capture="environment"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) => void handleUpload(event)}
                />
              </label>
            )}
          </div>
        </div>

        {(error || actionError) && (
          <p className="ui-alert-danger" role="alert">
            {actionError ??
              (error instanceof Error ? formatSupabaseError(error) : 'Could not load photos.')}
          </p>
        )}

        <FolderCards
          folders={[
            {
              id: 'gallery',
              title: 'Gallery',
              description: 'Browse captures for this deal',
              icon: <Camera className="h-5 w-5" />,
              count: isLoading ? '…' : displayPhotos.length,
              onSelect: () => setNavigation(selectedLand.id, 'gallery'),
            },
            {
              id: 'map',
              title: 'Map overlay',
              description: 'See GPS pins on the land boundary',
              icon: <MapPin className="h-5 w-5" />,
              onSelect: () => setNavigation(selectedLand.id, 'map'),
            },
          ]}
        />
      </div>
    )
  }

  const selectedPhoto =
    displayPhotos.find((photo) => photo.id === selectedPhotoId) ?? null

  return (
    <div className="space-y-5">
      <HierarchyNav
        crumbs={[
          { label: 'All deals', onClick: () => setNavigation(null, null) },
          { label: selectedLand.title, onClick: () => setNavigation(selectedLand.id, null) },
          { label: 'Gallery' },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="ui-section-title">Gallery</h2>
          <p className="ui-section-desc">
            {displayPhotos.length} photo{displayPhotos.length === 1 ? '' : 's'} · open one to
            review
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setNavigation(selectedLand.id, null)}>
            <ArrowLeft className="h-4 w-4" />
            Folders
          </Button>
          {canUpload && (
            <label className="inline-flex">
              <IconActionButton
                label={uploading ? 'Uploading…' : 'Upload photo'}
                icon={<Upload className="h-4 w-4" />}
                variant="primary"
                disabled={uploading}
                onClick={() => document.getElementById('hierarchy-photo-upload-gallery')?.click()}
              />
              <input
                id="hierarchy-photo-upload-gallery"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                capture="environment"
                className="sr-only"
                disabled={uploading}
                onChange={(event) => void handleUpload(event)}
              />
            </label>
          )}
        </div>
      </div>

      {(error || actionError) && (
        <p className="ui-alert-danger" role="alert">
          {actionError ??
            (error instanceof Error ? formatSupabaseError(error) : 'Could not load photos.')}
        </p>
      )}

      {isLoading && displayPhotos.length === 0 && (
        <p className="text-sm text-muted">Loading photos…</p>
      )}

      {!isLoading && displayPhotos.length === 0 && (
        <EmptyState title="No photos yet" description="Upload a capture to get started." />
      )}

      {displayPhotos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayPhotos.map((photo) => (
            <PhotoThumb
              key={photo.id}
              photo={photo}
              previewUrl={previewUrls[photo.id]}
              getPhotoUrl={getPhotoUrl}
              selected={selectedPhotoId === photo.id}
              onSelect={() => setSelectedPhotoId(photo.id)}
            />
          ))}
        </div>
      )}

      <PhotoDetailDrawer
        photo={selectedPhoto}
        landTitle={selectedLand.title}
        previewUrl={selectedPhoto ? previewUrls[selectedPhoto.id] : undefined}
        getPhotoUrl={getPhotoUrl}
        uploading={uploading}
        onClose={() => setSelectedPhotoId(null)}
        onViewOnMap={() => {
          const photoId = selectedPhoto?.id
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            next.set('land', selectedLand.id)
            next.set('folder', 'map')
            if (photoId) {
              next.set('photo', photoId)
            }
            return next
          })
        }}
      />
    </div>
  )
}

function PhotoThumb({
  photo,
  previewUrl,
  getPhotoUrl,
  selected,
  onSelect,
}: {
  photo: {
    id: string
    file_path: string | null
    captured_at: string
  }
  previewUrl?: string
  getPhotoUrl: (path: string) => Promise<string>
  selected: boolean
  onSelect: () => void
}) {
  const [url, setUrl] = useState<string | null>(previewUrl ?? null)

  useEffect(() => {
    if (previewUrl) {
      setUrl(previewUrl)
      return
    }
    if (!photo.file_path) {
      return
    }
    void getPhotoUrl(photo.file_path).then(setUrl).catch(() => setUrl(null))
  }, [photo.file_path, getPhotoUrl, previewUrl])

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`overflow-hidden rounded-lg border text-left transition ${
        selected
          ? 'border-brand-500 ring-2 ring-brand-500 ring-offset-2'
          : 'border-border hover:border-brand-300'
      }`}
    >
      {url ? (
        <img src={url} alt="Field capture" className="h-40 w-full object-cover" />
      ) : (
        <div className="flex h-40 items-center justify-center bg-surface text-sm text-muted">
          Loading…
        </div>
      )}
    </button>
  )
}
