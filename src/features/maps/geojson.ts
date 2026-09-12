import type { Json } from '@/types/database'

export type LatLngTuple = [number, number]

export interface GeoJsonPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

export function isGeoJsonPolygon(value: unknown): value is GeoJsonPolygon {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as { type?: unknown; coordinates?: unknown }
  if (candidate.type !== 'Polygon' || !Array.isArray(candidate.coordinates)) {
    return false
  }

  const rings = candidate.coordinates
  if (rings.length === 0 || !Array.isArray(rings[0]) || rings[0].length < 4) {
    return false
  }

  return rings.every(
    (ring) =>
      Array.isArray(ring) &&
      ring.length >= 4 &&
      ring.every(
        (point) =>
          Array.isArray(point) &&
          point.length >= 2 &&
          typeof point[0] === 'number' &&
          typeof point[1] === 'number' &&
          Number.isFinite(point[0]) &&
          Number.isFinite(point[1]),
      ),
  )
}

/** Leaflet uses [lat, lng]; GeoJSON uses [lng, lat]. */
export function polygonToLatLngs(polygon: GeoJsonPolygon): LatLngTuple[] {
  return polygon.coordinates[0].map(([lng, lat]) => [lat, lng])
}

export function latLngsToPolygon(latLngs: LatLngTuple[]): GeoJsonPolygon {
  const ring = latLngs.map(([lat, lng]) => [lng, lat])
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([...first!])
  }
  return { type: 'Polygon', coordinates: [ring] }
}

export function parseBoundaryGeoJson(value: Json | null | undefined): GeoJsonPolygon | null {
  if (!value) {
    return null
  }
  return isGeoJsonPolygon(value) ? value : null
}

export function defaultCenter(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): LatLngTuple {
  if (
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return [latitude, longitude]
  }
  // Mubende District, Uganda — fallback when a record has no pin yet
  return [0.5605, 31.395]
}

const EARTH_RADIUS_M = 6_378_137

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Open ring without the repeated closing coordinate. */
export function openRing(polygon: GeoJsonPolygon): number[][] {
  const ring = polygon.coordinates[0]
  if (ring.length < 2) {
    return ring
  }
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring.slice(0, -1)
  }
  return ring
}

/** Spherical polygon area in hectares. Accurate enough for parcel-scale polygons. */
export function polygonAreaHectares(polygon: GeoJsonPolygon): number {
  const ring = openRing(polygon)
  if (ring.length < 3) {
    return 0
  }

  let area = 0
  for (let index = 0; index < ring.length; index += 1) {
    const [lng1, lat1] = ring[index]
    const [lng2, lat2] = ring[(index + 1) % ring.length]
    area +=
      toRadians(lng2 - lng1) *
      (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)))
  }

  const squareMeters = Math.abs((area * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2)
  return squareMeters / 10_000
}

export function formatHectares(hectares: number): string {
  if (!Number.isFinite(hectares) || hectares <= 0) {
    return '0 ha'
  }
  const digits = hectares >= 10 ? 1 : 2
  return `${hectares.toFixed(digits)} ha`
}

/** Ray cast. GeoJSON ring is [lng, lat]. */
export function pointInPolygon(
  latitude: number,
  longitude: number,
  polygon: GeoJsonPolygon,
): boolean {
  const ring = polygon.coordinates[0]
  let inside = false

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index]
    const prior = ring[previous]
    if (!current || !prior) {
      continue
    }
    const xi = current[0]
    const yi = current[1]
    const xj = prior[0]
    const yj = prior[1]
    const crossesLatitude = yi > latitude !== yj > latitude
    if (!crossesLatitude) {
      continue
    }
    const edgeLongitude =
      ((xj - xi) * (latitude - yi)) / (yj - yi || Number.EPSILON) + xi
    if (longitude < edgeLongitude) {
      inside = !inside
    }
  }

  return inside
}
