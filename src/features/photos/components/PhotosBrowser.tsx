import { useEffect, useMemo, useRef, useState } from 'react'
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
import { openCameraStream } from '@/features/photos/cameraAccess'
import { compressImageFile } from '@/features/photos/captureImage'
import { FieldCamera } from '@/features/photos/components/FieldCamera'
import {
  getLastKnownGeolocation,
  isAccurateFix,
  startGeolocationWarmup,
  TARGET_ACCURACY_M,
  type GeoCoords,
} from '@/features/photos/geolocation'
import { usePhotos } from '@/features/photos/usePhotos'
import { siteCoordinate } from '@/lib/land-records'
import { notifySuccess } from '@/features/notifications/useNotifications'
import { LandMapPanel } from '@/features/maps/components/LandMapPanel'
import { PhotoDetailDrawer } from '@/features/photos/components/PhotoDetailDrawer'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { PHOTO_MIME_TYPES, type LandPhoto } from '@/types/photos'

interface LandOption {
  id: string
  title: string
  latitude?: number | string | null
  longitude?: number | string | null
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
  const [cameraStream, setCameraStream] = useState<Promise<MediaStream> | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})

  const { photos, isLoading, error, uploadPhoto, getPhotoUrl } = usePhotos(selectedLandId)
  const siteLatitude = siteCoordinate(selectedLand?.latitude)
  const siteLongitude = siteCoordinate(selectedLand?.longitude)

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
          accuracy_m: null,
          captured_at: new Date().toISOString(),
        })),
    [previewUrls, selectedLandId],
  )

  const displayPhotos = useMemo(
    () => [...optimisticPhotos, ...photos],
    [optimisticPhotos, photos],
  )

  const openCamera = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setActionError('This browser cannot open a camera. Upload a photo from your library instead.')
      return
    }
    setActionError(null)
    setCameraStream(openCameraStream('environment'))
  }

  const saveCapture = async (
    file: File,
    capturedAt: string,
    pin: GeoCoords,
    source: 'gps' | 'land',
  ) => {
    if (!selectedLandId) {
      return
    }

    const landId = selectedLandId
    const previewUrl = URL.createObjectURL(file)
    const tempId = `local-${crypto.randomUUID()}`

    setCameraStream(null)
    setActionError(null)
    setPreviewUrls((current) => ({ ...current, [tempId]: previewUrl }))
    setSelectedPhotoId(tempId)
    if (selectedFolder !== 'gallery') {
      setNavigation(landId, 'gallery')
    }
    setUploading(true)

    try {
      if (source === 'gps' && !isAccurateFix(pin, TARGET_ACCURACY_M)) {
        throw new Error('GPS must be within 10m before this photo can be saved.')
      }
      const photo = await uploadPhoto(
        file,
        landId,
        capturedAt,
        source === 'gps' ? pin : undefined,
      )

      setPreviewUrls((current) => {
        const next = { ...current }
        delete next[tempId]
        next[photo.id] = previewUrl
        return next
      })
      setSelectedPhotoId(photo.id)
      if (source === 'gps' && pin.accuracyM != null) {
        notifySuccess(`Photo saved with GPS (±${Math.round(pin.accuracyM)}m).`)
      } else if (photo.latitude != null && photo.longitude != null) {
        notifySuccess('Photo saved at the land site.')
      } else {
        notifySuccess('Photo saved. This land has no site coordinates yet.')
      }
      setUploading(false)
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

  const saveCameraShot = async (file: File, capturedAt: string) => {
    const coords = getLastKnownGeolocation()
    if (!coords || !isAccurateFix(coords, TARGET_ACCURACY_M)) {
      setActionError('GPS must be within 10m before this photo can be saved.')
      return
    }
    await saveCapture(file, capturedAt, coords, 'gps')
  }

  const saveLibraryFile = async (file: File) => {
    if (!selectedLandId) {
      return
    }
    if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
      setCameraStream(null)
      setActionError('Only PNG, JPG, and WebP images are accepted.')
      return
    }

    const capturedAt = new Date().toISOString()
    setCameraStream(null)
    setUploading(true)
    setActionError(null)
    try {
      const compressed = await compressImageFile(file, Date.parse(capturedAt))
      await saveCapture(
        compressed,
        capturedAt,
        { latitude: siteLatitude, longitude: siteLongitude, accuracyM: null },
        'land',
      )
    } catch (uploadError) {
      setActionError(uploadError instanceof Error ? uploadError.message : 'Could not prepare the photo.')
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
            <p className="ui-section-desc">
              Camera photos need a GPS fix within 10m. Library uploads use the land site pin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setNavigation(null, null)}>
              <ArrowLeft className="h-4 w-4" />
              All deals
            </Button>
            {canUpload && (
              <CaptureControls
                uploading={uploading}
                onOpenCamera={openCamera}
                onLibraryFile={(file) => void saveLibraryFile(file)}
              />
            )}
          </div>
        </div>

        {(error || actionError) && (
          <p className="ui-alert-danger" role="alert">
            {actionError ??
              (error instanceof Error ? formatSupabaseError(error) : 'Could not load photos.')}
          </p>
        )}

        {cameraStream && (
          <FieldCamera
            landTitle={selectedLand.title}
            initialStream={cameraStream}
            onClose={() => setCameraStream(null)}
            onCapture={(shot) => void saveCameraShot(shot.file, shot.capturedAt)}
            onPickLibrary={(file) => void saveLibraryFile(file)}
          />
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
            {displayPhotos.length} photo{displayPhotos.length === 1 ? '' : 's'}
            {' · camera GPS within 10m'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setNavigation(selectedLand.id, null)}>
            <ArrowLeft className="h-4 w-4" />
            Folders
          </Button>
          {canUpload && (
            <CaptureControls
              uploading={uploading}
              onOpenCamera={openCamera}
              onLibraryFile={(file) => void saveLibraryFile(file)}
            />
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
        <EmptyState title="No photos yet" description="Take a site photo to get started." />
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

      {cameraStream && (
        <FieldCamera
          landTitle={selectedLand.title}
          initialStream={cameraStream}
          onClose={() => setCameraStream(null)}
          onCapture={(shot) => void saveCameraShot(shot.file, shot.capturedAt)}
          onPickLibrary={(file) => void saveLibraryFile(file)}
        />
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

function CaptureControls({
  uploading,
  onOpenCamera,
  onLibraryFile,
}: {
  uploading: boolean
  onOpenCamera: () => void
  onLibraryFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={uploading} onClick={onOpenCamera}>
        <Camera className="h-4 w-4" />
        {uploading ? 'Saving…' : 'Take photo'}
      </Button>
      <IconActionButton
        label="Upload from library"
        icon={<Upload className="h-4 w-4" />}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) {
            onLibraryFile(file)
          }
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
