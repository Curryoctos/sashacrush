import { useEffect, useState } from 'react'
import { ArrowLeft, Camera, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/PageHeader'
import { IconActionButton } from '@/components/ui/IconActionButton'
import {
  DealCards,
  FolderCards,
  HierarchyNav,
} from '@/components/hierarchy/Hierarchy'
import { useLandHierarchyNav } from '@/hooks/useLandHierarchyNav'
import { readGeolocation, usePhotos } from '@/features/photos/usePhotos'
import { notifySuccess } from '@/features/notifications/useNotifications'
import { formatSupabaseError } from '@/lib/supabase-errors'

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
  const { selectedLandId, selectedLand, selectedFolder, setNavigation } =
    useLandHierarchyNav(lands)
  const [uploading, setUploading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)

  const { photos, isLoading, error, uploadPhoto, getPhotoUrl } = usePhotos(selectedLandId)

  useEffect(() => {
    setSelectedPhotoId(null)
  }, [selectedLandId, selectedFolder])

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
      notifySuccess('Photo uploaded.')
      event.target.value = ''
      if (selectedFolder !== 'gallery') {
        setNavigation(selectedLandId, 'gallery')
      }
    } catch (uploadError) {
      setActionError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
    } finally {
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
              count: isLoading ? '…' : photos.length,
              onSelect: () => setNavigation(selectedLand.id, 'gallery'),
            },
          ]}
        />
      </div>
    )
  }

  const selectedPhoto = photos.find((photo) => photo.id === selectedPhotoId) ?? null

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
            {photos.length} photo{photos.length === 1 ? '' : 's'} · tap one for details
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

      {isLoading && <p className="text-sm text-muted">Loading photos…</p>}

      {!isLoading && photos.length === 0 && (
        <EmptyState title="No photos yet" description="Upload a capture to get started." />
      )}

      {photos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <PhotoThumb
              key={photo.id}
              photo={photo}
              getPhotoUrl={getPhotoUrl}
              selected={selectedPhotoId === photo.id}
              onSelect={() => setSelectedPhotoId(photo.id)}
            />
          ))}
        </div>
      )}

      {selectedPhoto && (
        <div className="ui-panel p-4">
          <p className="text-sm font-semibold text-ink">Photo details</p>
          <p className="mt-2 text-sm text-muted">
            Captured {new Date(selectedPhoto.captured_at).toLocaleString()}
          </p>
          {selectedPhoto.latitude != null && selectedPhoto.longitude != null ? (
            <p className="mt-1 text-sm text-muted">
              GPS {selectedPhoto.latitude.toFixed(5)}, {selectedPhoto.longitude.toFixed(5)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">No GPS coordinates</p>
          )}
        </div>
      )}
    </div>
  )
}

function PhotoThumb({
  photo,
  getPhotoUrl,
  selected,
  onSelect,
}: {
  photo: {
    id: string
    file_path: string | null
    captured_at: string
  }
  getPhotoUrl: (path: string) => Promise<string>
  selected: boolean
  onSelect: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!photo.file_path) {
      return
    }
    void getPhotoUrl(photo.file_path).then(setUrl).catch(() => setUrl(null))
  }, [photo.file_path, getPhotoUrl])

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
