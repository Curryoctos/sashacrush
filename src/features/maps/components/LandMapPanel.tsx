import { useEffect, useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import {
  LandMapCanvas,
  LandMapEditorToolbar,
  useBoundaryDraft,
  type LandMapPhotoPin,
} from '@/features/maps/components/LandMapCanvas'
import { useLandMap, useSaveLandBoundary, useSaveSitePin } from '@/features/maps/useLandMap'
import { formatHectares, pointInPolygon, polygonAreaHectares } from '@/features/maps/geojson'
import { googleMapsDirectionsUrl, uberDropoffUrl } from '@/features/maps/siteTravel'
import { PhotoDetailDrawer } from '@/features/photos/components/PhotoDetailDrawer'
import { notifySuccess } from '@/features/notifications/useNotifications'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { supabase } from '@/lib/supabase'
import { PHOTOS_BUCKET } from '@/types/photos'

interface LandMapPanelProps {
  landId: string
  canEditBoundary?: boolean
  showPhotoPins?: boolean
  title?: string
  description?: string
  highlightPhotoId?: string | null
  onPhotoFocus?: (photoId: string | null) => void
}

async function resolvePhotoPins(
  photos: Awaited<ReturnType<typeof useLandMap>>['data'],
): Promise<LandMapPhotoPin[]> {
  if (!photos) {
    return []
  }

  const tagged = photos.photos.filter(
    (photo) => photo.latitude != null && photo.longitude != null && photo.file_path,
  )

  const pins: LandMapPhotoPin[] = []
  for (const photo of tagged) {
    const { data } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrl(photo.file_path!, 3600)
    pins.push({ photo, url: data?.signedUrl ?? null })
  }
  return pins
}

export function LandMapPanel({
  landId,
  canEditBoundary = false,
  showPhotoPins = true,
  title = 'Site map',
  description = 'Parcel boundary, site pin, and geotagged field photos.',
  highlightPhotoId = null,
  onPhotoFocus,
}: LandMapPanelProps) {
  const mapQuery = useLandMap(landId)
  const saveBoundary = useSaveLandBoundary(landId)
  const savePin = useSaveSitePin(landId)
  const draft = useBoundaryDraft(mapQuery.data?.boundary ?? null)
  const [photoPins, setPhotoPins] = useState<LandMapPhotoPin[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [placingPin, setPlacingPin] = useState(false)
  const [pinDraft, setPinDraft] = useState<{ latitude: number; longitude: number } | null>(null)
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(highlightPhotoId)

  useEffect(() => {
    let cancelled = false
    if (!showPhotoPins || !mapQuery.data) {
      setPhotoPins([])
      return
    }

    const boundary = mapQuery.data.boundary
    void resolvePhotoPins(mapQuery.data).then((pins) => {
      if (cancelled) {
        return
      }
      setPhotoPins(
        pins.map((pin) => ({
          ...pin,
          outsideBoundary: Boolean(
            boundary &&
              pin.photo.latitude != null &&
              pin.photo.longitude != null &&
              !pointInPolygon(pin.photo.latitude, pin.photo.longitude, boundary),
          ),
        })),
      )
    })

    return () => {
      cancelled = true
    }
  }, [mapQuery.data, showPhotoPins])

  useEffect(() => {
    draft.cancel()
    setPlacingPin(false)
    setPinDraft(null)
    setSelectedPhotoId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset editor when switching lands
  }, [landId])

  useEffect(() => {
    setSelectedPhotoId(highlightPhotoId)
  }, [highlightPhotoId])

  const handleSave = async () => {
    if (!draft.draftPolygon) {
      return
    }
    setActionError(null)
    try {
      await saveBoundary.mutateAsync(draft.draftPolygon)
      draft.finishSaved()
      notifySuccess('Boundary saved.')
    } catch (error) {
      setActionError(
        error instanceof Error ? formatSupabaseError(error) : 'Could not save boundary.',
      )
    }
  }

  const persistPin = async (point: { latitude: number; longitude: number }) => {
    setPinDraft(point)
    setActionError(null)
    try {
      await savePin.mutateAsync(point)
      setPlacingPin(false)
      setPinDraft(null)
      notifySuccess('Site pin saved.')
    } catch (error) {
      setPinDraft(null)
      setActionError(
        error instanceof Error ? formatSupabaseError(error) : 'Could not save site pin.',
      )
    }
  }

  const handlePinChange = (point: [number, number]) => {
    void persistPin({ latitude: point[0], longitude: point[1] })
  }

  const selectPhoto = (photoId: string | null) => {
    setSelectedPhotoId(photoId)
    onPhotoFocus?.(photoId)
  }

  if (mapQuery.isLoading) {
    return (
      <Card>
        <p className="text-sm text-muted">Loading map…</p>
      </Card>
    )
  }

  if (mapQuery.error || !mapQuery.data) {
    return (
      <Card>
        <p className="ui-alert-danger" role="alert">
          {mapQuery.error
            ? formatSupabaseError(mapQuery.error as Error)
            : 'Could not load map.'}
        </p>
      </Card>
    )
  }

  const { land, boundary } = mapQuery.data
  const latitude = pinDraft?.latitude ?? land.latitude
  const longitude = pinDraft?.longitude ?? land.longitude
  const hasSite = latitude != null && longitude != null
  const destination = hasSite
    ? { latitude: latitude!, longitude: longitude!, label: land.title }
    : null
  const areaSource = draft.drawing && draft.draftPolygon ? draft.draftPolygon : boundary
  const hectares = areaSource ? polygonAreaHectares(areaSource) : null
  const areaLabel =
    hectares && hectares > 0
      ? draft.drawing
        ? `Draft area · ${formatHectares(hectares)}`
        : `Parcel area · ${formatHectares(hectares)}`
      : null
  const outsideCount = photoPins.filter((pin) => pin.outsideBoundary).length
  const selectedPin = photoPins.find((pin) => pin.photo.id === selectedPhotoId) ?? null
  const focusPoint =
    selectedPin?.photo.latitude != null && selectedPin.photo.longitude != null
      ? ([selectedPin.photo.latitude, selectedPin.photo.longitude] as [number, number])
      : null

  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {canEditBoundary && !draft.drawing && (
            <button
              type="button"
              onClick={() => setPlacingPin((current) => !current)}
              className="rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-ink"
            >
              {placingPin ? 'Done placing pin' : hasSite ? 'Move site pin' : 'Set site pin'}
            </button>
          )}
          {canEditBoundary && (
            <LandMapEditorToolbar
              drawing={draft.drawing}
              hasBoundary={Boolean(boundary)}
              vertexCount={draft.vertices.length}
              saving={saveBoundary.isPending}
              canSave={draft.canSave}
              onStartDraw={() => {
                setPlacingPin(false)
                draft.startDraw()
              }}
              onUndo={draft.undo}
              onClear={draft.clear}
              onCancel={draft.cancel}
              onSave={() => void handleSave()}
            />
          )}
          {destination && (
            <>
              <a
                href={uberDropoffUrl(destination)}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/90"
              >
                Get Uber to this site
              </a>
              <a
                href={googleMapsDirectionsUrl(destination)}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-ink"
              >
                Google Maps directions
              </a>
            </>
          )}
        </div>

        {(actionError || saveBoundary.error || savePin.error) && (
          <p className="ui-alert-danger" role="alert">
            {actionError ??
              (saveBoundary.error
                ? formatSupabaseError(saveBoundary.error as Error)
                : savePin.error
                  ? formatSupabaseError(savePin.error as Error)
                  : null)}
          </p>
        )}

        <LandMapCanvas
          latitude={latitude}
          longitude={longitude}
          boundary={draft.drawing ? null : boundary}
          photoPins={showPhotoPins ? photoPins : []}
          drawing={draft.drawing}
          placingPin={placingPin && !draft.drawing}
          pinDraggable={canEditBoundary && !draft.drawing}
          draftVertices={draft.vertices}
          focusPoint={focusPoint}
          highlightedPhotoId={selectedPhotoId}
          onMapClick={draft.drawing ? draft.addVertex : undefined}
          onVertexMove={draft.drawing ? draft.moveVertex : undefined}
          onVertexRemove={draft.drawing ? draft.removeVertex : undefined}
          onPhotoSelect={showPhotoPins ? selectPhoto : undefined}
          onSitePinChange={
            canEditBoundary && !draft.drawing
              ? (point) => handlePinChange(point)
              : undefined
          }
        />

        {placingPin && !draft.drawing && (
          <p className="text-xs text-muted">
            Click the map to drop the site pin, or drag the marker. It saves immediately.
          </p>
        )}

        {hasSite && (
          <p className="text-xs text-muted">
            Site {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
            {savePin.isPending ? ' · saving…' : ''}
          </p>
        )}

        {areaLabel && (
          <p className="text-xs font-medium text-ink">{areaLabel}</p>
        )}

        {draft.drawing && (
          <p className="text-xs text-muted">
            Drag a corner to reshape the parcel. Click the map to add a corner, or open a corner and remove it.
          </p>
        )}

        {outsideCount > 0 && !draft.drawing && (
          <p className="text-xs font-medium text-danger">
            {outsideCount} photo{outsideCount === 1 ? '' : 's'} sit outside the parcel boundary.
          </p>
        )}

        {!boundary && !draft.drawing && (
          <p className="text-xs text-muted">
            No boundary polygon yet
            {canEditBoundary ? ' — draw one to save GeoJSON on this land record.' : '.'}
          </p>
        )}

        {!hasSite && !canEditBoundary && (
          <p className="text-xs text-muted">No site pin yet — travel links appear once coordinates are set.</p>
        )}
      </div>

      <PhotoDetailDrawer
        photo={selectedPin?.photo ?? null}
        landTitle={land.title}
        previewUrl={selectedPin?.url ?? undefined}
        getPhotoUrl={async (filePath) => {
          const { data, error } = await supabase.storage
            .from(PHOTOS_BUCKET)
            .createSignedUrl(filePath, 3600)
          if (error || !data?.signedUrl) {
            throw new Error('Could not load photo.')
          }
          return data.signedUrl
        }}
        onClose={() => selectPhoto(null)}
        outsideBoundary={selectedPin?.outsideBoundary}
      />
    </Card>
  )
}
