import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polygon, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Card, CardHeader } from '@/components/ui/Card'
import {
  defaultCenter,
  parseBoundaryGeoJson,
  polygonToLatLngs,
  type LatLngTuple,
} from '@/features/maps/geojson'
import { SiteTravelLinks } from '@/features/maps/components/SiteTravelLinks'
import { ensureLeafletDefaults } from '@/features/maps/leafletSetup'
import type { Json } from '@/types/database'

ensureLeafletDefaults()

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

export interface DealMapParcel {
  id: string
  title: string
  status?: string | null
  latitude: number | null
  longitude: number | null
  boundary_geojson: Json | null
}

function FitAll({ points }: { points: LatLngTuple[] }) {
  const map = useMap()

  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 14 })
      return
    }
    if (points.length === 1) {
      map.setView(points[0], 13)
    }
  }, [map, points])

  return null
}

function ParcelPopup({
  parcel,
  onSelect,
}: {
  parcel: DealMapParcel
  onSelect: (landId: string) => void
}) {
  const hasSite = parcel.latitude != null && parcel.longitude != null

  return (
    <div className="min-w-[10rem] space-y-2">
      <button
        type="button"
        className="text-sm font-medium text-ink underline"
        onClick={() => onSelect(parcel.id)}
      >
        {parcel.title}
      </button>
      {hasSite ? (
        <SiteTravelLinks
          compact
          className="flex flex-col items-start gap-1"
          destination={{
            latitude: parcel.latitude!,
            longitude: parcel.longitude!,
            label: parcel.title,
          }}
        />
      ) : null}
    </div>
  )
}

export function DealsMap({
  parcels,
  onSelect,
  title = 'All parcels',
  description = 'Every deal with a pin or boundary. Select one to open it.',
}: {
  parcels: DealMapParcel[]
  onSelect: (landId: string) => void
  title?: string
  description?: string
}) {
  const plotted = useMemo(
    () =>
      parcels
        .map((parcel) => ({
          parcel,
          boundary: parseBoundaryGeoJson(parcel.boundary_geojson),
        }))
        .filter(
          (item) =>
            item.boundary ||
            (item.parcel.latitude != null && item.parcel.longitude != null),
        ),
    [parcels],
  )

  const fitPoints = useMemo(() => {
    const points: LatLngTuple[] = []
    for (const item of plotted) {
      if (item.boundary) {
        points.push(...polygonToLatLngs(item.boundary))
      } else if (item.parcel.latitude != null && item.parcel.longitude != null) {
        points.push([item.parcel.latitude, item.parcel.longitude])
      }
    }
    return points
  }, [plotted])

  const unplotted = parcels.length - plotted.length

  return (
    <Card>
      <CardHeader title={title} description={description} />
      {plotted.length === 0 ? (
        <p className="text-sm text-muted">No parcels have coordinates yet.</p>
      ) : (
        <div className="h-80 overflow-hidden rounded-lg border border-border">
          <MapContainer
            center={defaultCenter(null, null)}
            zoom={8}
            className="h-full w-full"
            style={{ minHeight: '20rem' }}
          >
            <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_URL} />
            <FitAll points={fitPoints} />
            {plotted.map(({ parcel, boundary }) =>
              boundary ? (
                <Polygon
                  key={`${parcel.id}-boundary`}
                  positions={polygonToLatLngs(boundary)}
                  pathOptions={{
                    color: '#12512e',
                    weight: 2,
                    fillColor: '#1f7a45',
                    fillOpacity: 0.2,
                  }}
                  eventHandlers={{
                    click: () => onSelect(parcel.id),
                  }}
                >
                  <Popup>
                    <ParcelPopup parcel={parcel} onSelect={onSelect} />
                  </Popup>
                </Polygon>
              ) : null,
            )}
            {plotted.map(({ parcel }) =>
              parcel.latitude != null && parcel.longitude != null ? (
                <Marker key={`${parcel.id}-pin`} position={[parcel.latitude, parcel.longitude]}>
                  <Popup>
                    <ParcelPopup parcel={parcel} onSelect={onSelect} />
                  </Popup>
                </Marker>
              ) : null,
            )}
          </MapContainer>
        </div>
      )}
      {unplotted > 0 ? (
        <p className="mt-3 text-xs text-muted">
          {unplotted} deal{unplotted === 1 ? '' : 's'} have no map location yet.
        </p>
      ) : null}
    </Card>
  )
}
