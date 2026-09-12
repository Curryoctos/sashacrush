import { describe, expect, it } from 'vitest'
import {
  formatHectares,
  isGeoJsonPolygon,
  latLngsToPolygon,
  parseBoundaryGeoJson,
  pointInPolygon,
  polygonAreaHectares,
  polygonToLatLngs,
} from '@/features/maps/geojson'

describe('geojson helpers', () => {
  it('round-trips polygon coordinates between Leaflet and GeoJSON', () => {
    const leaflet = [
      [0.557, 31.39],
      [0.557, 31.4],
      [0.564, 31.4],
      [0.564, 31.39],
    ] as Array<[number, number]>

    const polygon = latLngsToPolygon(leaflet)
    expect(isGeoJsonPolygon(polygon)).toBe(true)
    expect(polygon.coordinates[0]).toHaveLength(5)
    expect(polygonToLatLngs(polygon).slice(0, 4)).toEqual(leaflet)
  })

  it('rejects invalid boundary payloads', () => {
    expect(parseBoundaryGeoJson(null)).toBeNull()
    expect(parseBoundaryGeoJson({ type: 'Point', coordinates: [1, 2] })).toBeNull()
    expect(
      parseBoundaryGeoJson({
        type: 'Polygon',
        coordinates: [[[31.39, 0.557], [31.4, 0.557]]],
      }),
    ).toBeNull()
  })
})

describe('parcel analytics', () => {
  const mubende = latLngsToPolygon([
    [0.557, 31.39],
    [0.557, 31.4],
    [0.564, 31.4],
    [0.564, 31.39],
  ])

  it('reports a positive hectare area for a closed parcel', () => {
    const hectares = polygonAreaHectares(mubende)
    expect(hectares).toBeGreaterThan(50)
    expect(hectares).toBeLessThan(200)
    expect(formatHectares(hectares)).toMatch(/ha$/)
  })

  it('flags points outside the boundary', () => {
    expect(pointInPolygon(0.56, 31.395, mubende)).toBe(true)
    expect(pointInPolygon(0.57, 31.42, mubende)).toBe(false)
  })
})
