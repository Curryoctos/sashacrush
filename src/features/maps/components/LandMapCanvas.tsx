import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import {
  defaultCenter,
  latLngsToPolygon,
  polygonToLatLngs,
  type GeoJsonPolygon,
  type LatLngTuple,
} from '@/features/maps/geojson'
import { ensureLeafletDefaults } from '@/features/maps/leafletSetup'
import { photoAccuracyMeters, type LandPhoto } from '@/types/photos'

ensureLeafletDefaults()

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

function photoPinIcon(outside: boolean, highlighted: boolean) {
  const color = outside ? '#b42318' : '#176539'
  const size = highlighted ? 18 : 14
  const ring = highlighted ? 'box-shadow:0 0 0 3px rgba(18,81,46,.35)' : 'box-shadow:0 1px 4px rgba(0,0,0,.35)'
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #fff;${ring}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export interface LandMapPhotoPin {
  photo: LandPhoto
  url: string | null
  outsideBoundary?: boolean
}

interface LandMapCanvasProps {
  latitude: number | null
  longitude: number | null
  boundary: GeoJsonPolygon | null
  photoPins?: LandMapPhotoPin[]
  drawing?: boolean
  placingPin?: boolean
  pinDraggable?: boolean
  draftVertices?: LatLngTuple[]
  onMapClick?: (point: LatLngTuple) => void
  onSitePinChange?: (point: LatLngTuple) => void
  onVertexMove?: (index: number, point: LatLngTuple) => void
  onVertexRemove?: (index: number) => void
  onPhotoSelect?: (photoId: string) => void
  focusPoint?: LatLngTuple | null
  highlightedPhotoId?: string | null
  className?: string
}

function FitBounds({
  points,
  fallback,
}: {
  points: LatLngTuple[]
  fallback: LatLngTuple
}) {
  const map = useMap()

  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 16 })
      return
    }
    if (points.length === 1) {
      map.setView(points[0], 14)
      return
    }
    map.setView(fallback, 12)
  }, [map, points, fallback])

  return null
}


function FlyTo({ point }: { point: LatLngTuple | null | undefined }) {
  const map = useMap()

  useEffect(() => {
    if (!point) {
      return
    }
    map.flyTo(point, Math.max(map.getZoom(), 16), { duration: 0.45 })
  }, [map, point])

  return null
}

function DrawClickHandler({
  enabled,
  onMapClick,
}: {
  enabled: boolean
  onMapClick?: (point: LatLngTuple) => void
}) {
  useMapEvents({
    click(event) {
      if (!enabled || !onMapClick) {
        return
      }
      onMapClick([event.latlng.lat, event.latlng.lng])
    },
  })
  return null
}

export function LandMapCanvas({
  latitude,
  longitude,
  boundary,
  photoPins = [],
  drawing = false,
  placingPin = false,
  pinDraggable = false,
  draftVertices = [],
  onMapClick,
  onSitePinChange,
  onVertexMove,
  onVertexRemove,
  onPhotoSelect,
  focusPoint = null,
  highlightedPhotoId = null,
  className,
}: LandMapCanvasProps) {
  const center = useMemo(
    () => defaultCenter(latitude, longitude),
    [latitude, longitude],
  )

  const boundaryLatLngs = useMemo(
    () => (boundary ? polygonToLatLngs(boundary) : []),
    [boundary],
  )

  const fitPoints = useMemo(() => {
    const points: LatLngTuple[] = [...boundaryLatLngs, ...draftVertices]
    for (const pin of photoPins) {
      if (pin.photo.latitude != null && pin.photo.longitude != null) {
        points.push([pin.photo.latitude, pin.photo.longitude])
      }
    }
    if (latitude != null && longitude != null) {
      points.push([latitude, longitude])
    }
    return points
  }, [boundaryLatLngs, draftVertices, photoPins, latitude, longitude])

  const draftClosed =
    draftVertices.length >= 3 ? latLngsToPolygon(draftVertices) : null

  return (
    <div className={className ?? 'h-80 w-full overflow-hidden rounded-lg border border-border'}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={!drawing}
        className="h-full w-full"
        style={{ minHeight: '20rem' }}
      >
        <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_URL} />
        {!focusPoint && <FitBounds points={fitPoints} fallback={center} />}
        <FlyTo point={focusPoint} />
        <DrawClickHandler
          enabled={drawing || placingPin}
          onMapClick={drawing ? onMapClick : placingPin ? onSitePinChange : undefined}
        />

        {boundaryLatLngs.length >= 3 && !drawing && (
          <Polygon
            positions={boundaryLatLngs}
            pathOptions={{
              color: '#12512e',
              weight: 2,
              fillColor: '#1f7a45',
              fillOpacity: 0.22,
            }}
          />
        )}

        {draftClosed && (
          <Polygon
            positions={polygonToLatLngs(draftClosed)}
            pathOptions={{
              color: '#b54708',
              weight: 2,
              dashArray: '6 4',
              fillColor: '#b54708',
              fillOpacity: 0.15,
            }}
          />
        )}

        {draftVertices.map((vertex, index) => (
          <Marker
            key={`draft-${index}`}
            position={vertex}
            draggable={drawing}
            eventHandlers={
              drawing && onVertexMove
                ? {
                    dragend(event) {
                      const marker = event.target as L.Marker
                      const point = marker.getLatLng()
                      onVertexMove(index, [point.lat, point.lng])
                    },
                  }
                : undefined
            }
          >
            <Popup>
              <button
                type="button"
                className="text-xs font-medium text-ink underline"
                onClick={() => onVertexRemove?.(index)}
              >
                Remove corner
              </button>
            </Popup>
          </Marker>
        ))}

        {latitude != null && longitude != null && (
          <Marker
            position={[latitude, longitude]}
            draggable={pinDraggable && !drawing}
            eventHandlers={
              pinDraggable && onSitePinChange
                ? {
                    dragend(event) {
                      const marker = event.target as L.Marker
                      const point = marker.getLatLng()
                      onSitePinChange([point.lat, point.lng])
                    },
                  }
                : undefined
            }
          >
            <Popup>{placingPin ? 'Click the map or drag this pin' : 'Site pin'}</Popup>
          </Marker>
        )}

        {photoPins.map(({ photo, url, outsideBoundary }) => {
          if (photo.latitude == null || photo.longitude == null) {
            return null
          }
          const highlighted = highlightedPhotoId === photo.id
          return (
            <Marker
              key={photo.id}
              position={[photo.latitude, photo.longitude]}
              icon={photoPinIcon(Boolean(outsideBoundary), highlighted)}
              eventHandlers={{
                click() {
                  onPhotoSelect?.(photo.id)
                },
              }}
            >
              <Popup>
                <div className="min-w-[10rem] space-y-2 text-sm">
                  {url ? (
                    <img
                      src={url}
                      alt="Field photo"
                      className="h-28 w-full rounded object-cover"
                    />
                  ) : (
                    <p className="text-muted">Thumbnail unavailable</p>
                  )}
                  <p className="text-xs text-muted">
                    {new Date(photo.captured_at).toLocaleString()}
                    {photoAccuracyMeters(photo.accuracy_m) != null
                      ? ` · GPS ±${Math.round(photoAccuracyMeters(photo.accuracy_m)!)}m`
                      : ''}
                  </p>
                  {outsideBoundary ? (
                    <p className="text-xs font-medium text-red-700">
                      Outside parcel — GPS may be off
                    </p>
                  ) : null}
                  {onPhotoSelect ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-ink underline"
                      onClick={() => onPhotoSelect(photo.id)}
                    >
                      Open photo
                    </button>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

interface LandMapEditorToolbarProps {
  drawing: boolean
  hasBoundary?: boolean
  vertexCount: number
  saving: boolean
  canSave: boolean
  onStartDraw: () => void
  onUndo: () => void
  onClear: () => void
  onCancel: () => void
  onSave: () => void
}

export function LandMapEditorToolbar({
  drawing,
  hasBoundary = false,
  vertexCount,
  saving,
  canSave,
  onStartDraw,
  onUndo,
  onClear,
  onCancel,
  onSave,
}: LandMapEditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!drawing ? (
        <button
          type="button"
          onClick={onStartDraw}
          className="rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800"
        >
          {hasBoundary ? 'Edit boundary' : 'Draw boundary'}
        </button>
      ) : (
        <>
          <p className="text-xs text-muted">
            Click the map to add vertices ({vertexCount}). Need at least 3.
          </p>
          <button
            type="button"
            onClick={onUndo}
            disabled={vertexCount === 0}
            className="rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
          >
            Undo corner
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={vertexCount === 0}
            className="rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave || saving}
            className="rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save boundary'}
          </button>
        </>
      )}
    </div>
  )
}

export function useBoundaryDraft(initial: GeoJsonPolygon | null) {
  const [drawing, setDrawing] = useState(false)
  const [vertices, setVertices] = useState<LatLngTuple[]>([])

  const startDraw = () => {
    setVertices(initial ? polygonToLatLngs(initial).slice(0, -1) : [])
    setDrawing(true)
  }

  const cancel = () => {
    setDrawing(false)
    setVertices([])
  }

  const addVertex = (point: LatLngTuple) => {
    setVertices((prev) => [...prev, point])
  }

  const undo = () => {
    setVertices((prev) => prev.slice(0, -1))
  }

  const moveVertex = (index: number, point: LatLngTuple) => {
    setVertices((prev) => prev.map((vertex, vertexIndex) => (vertexIndex === index ? point : vertex)))
  }

  const removeVertex = (index: number) => {
    setVertices((prev) => prev.filter((_, vertexIndex) => vertexIndex !== index))
  }

  const clear = () => {
    setVertices([])
  }

  const draftPolygon =
    vertices.length >= 3 ? latLngsToPolygon(vertices) : null

  return {
    drawing,
    vertices,
    draftPolygon,
    canSave: vertices.length >= 3,
    startDraw,
    cancel,
    addVertex,
    undo,
    moveVertex,
    removeVertex,
    clear,
    finishSaved: cancel,
  }
}
