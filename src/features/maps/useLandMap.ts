import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { photoAccuracyMeters, type LandPhoto } from '@/types/photos'
import type { Json, LandRecord } from '@/types/database'
import { parseBoundaryGeoJson, type GeoJsonPolygon } from '@/features/maps/geojson'

const LAND_MAP_COLUMNS =
  'id, title, location, latitude, longitude, boundary_geojson, status, seller_id'
const PHOTO_COLUMNS =
  'id, land_id, uploader_id, file_path, latitude, longitude, accuracy_m, captured_at'

export type LandMapRecord = Pick<
  LandRecord,
  | 'id'
  | 'title'
  | 'location'
  | 'latitude'
  | 'longitude'
  | 'boundary_geojson'
  | 'status'
  | 'seller_id'
>

export interface LandMapData {
  land: LandMapRecord
  photos: LandPhoto[]
  boundary: GeoJsonPolygon | null
}

export function useLandMap(landId: string | null | undefined) {
  return useQuery({
    queryKey: ['land-map', landId],
    enabled: Boolean(landId),
    queryFn: async (): Promise<LandMapData> => {
      const { data: land, error: landError } = await supabase
        .from('land_records')
        .select(LAND_MAP_COLUMNS)
        .eq('id', landId!)
        .single()

      if (landError || !land) {
        throw landError ?? new Error('Land record not found')
      }

      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select(PHOTO_COLUMNS)
        .eq('land_id', landId!)
        .order('captured_at', { ascending: false })

      if (photosError) {
        throw photosError
      }

      const record = land as LandMapRecord
      return {
        land: record,
        photos: ((photos ?? []) as LandPhoto[]).map((photo) => ({
          ...photo,
          accuracy_m: photoAccuracyMeters(photo.accuracy_m),
        })),
        boundary: parseBoundaryGeoJson(record.boundary_geojson),
      }
    },
  })
}

export function useSaveLandBoundary(landId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (boundary: GeoJsonPolygon | null) => {
      const { data, error } = await supabase
        .from('land_records')
        .update({ boundary_geojson: boundary as Json | null })
        .eq('id', landId)
        .select(LAND_MAP_COLUMNS)
        .single()

      if (error) {
        throw error
      }

      return data as LandMapRecord
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['land-map', landId] })
      void queryClient.invalidateQueries({ queryKey: ['deal-summary', landId] })
      void queryClient.invalidateQueries({ queryKey: ['land-records'] })
    },
  })
}

export function useSaveSitePin(landId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (point: { latitude: number; longitude: number }) => {
      const { data, error } = await supabase
        .from('land_records')
        .update({
          latitude: point.latitude,
          longitude: point.longitude,
        })
        .eq('id', landId)
        .select(LAND_MAP_COLUMNS)
        .single()

      if (error) {
        throw error
      }

      return data as LandMapRecord
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['land-map', landId] })
      void queryClient.invalidateQueries({ queryKey: ['deal-summary', landId] })
      void queryClient.invalidateQueries({ queryKey: ['land-records'] })
    },
  })
}
