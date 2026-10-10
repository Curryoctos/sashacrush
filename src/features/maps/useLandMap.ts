import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
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

type ExecutiveParcel = {
  land_id: string
  title: string
  location: string | null
  status: string
  latitude: number | null
  longitude: number | null
  boundary_geojson: Json | null
}

async function loadLandPhotos(landId: string): Promise<LandPhoto[]> {
  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select(PHOTO_COLUMNS)
    .eq('land_id', landId)
    .order('captured_at', { ascending: false })

  if (photosError) {
    throw photosError
  }

  return ((photos ?? []) as LandPhoto[]).map((photo) => ({
    ...photo,
    accuracy_m: photoAccuracyMeters(photo.accuracy_m),
  }))
}

async function loadExecutiveParcel(landId: string): Promise<LandMapRecord> {
  const { data: siteRows, error: siteError } = await supabase.rpc('executive_land_site', {
    p_land_id: landId,
  })

  let parcel: ExecutiveParcel | undefined = (siteRows ?? [])[0]

  // Site RPC may not be migrated yet — fall back to the portfolio map RPC.
  if (siteError || !parcel) {
    const { data: mapRows, error: mapError } = await supabase.rpc('executive_land_map')
    if (mapError) {
      throw siteError ?? mapError
    }
    parcel = ((mapRows ?? []) as ExecutiveParcel[]).find((row) => row.land_id === landId)
  }

  if (!parcel) {
    throw new Error('Land record not found')
  }

  return {
    id: parcel.land_id,
    title: parcel.title,
    location: parcel.location,
    latitude: parcel.latitude,
    longitude: parcel.longitude,
    boundary_geojson: parcel.boundary_geojson,
    status: parcel.status,
    seller_id: null,
  }
}

export function useLandMap(landId: string | null | undefined) {
  const { role } = useAuth()

  return useQuery({
    queryKey: ['land-map', landId, role],
    enabled: Boolean(landId && role),
    queryFn: async (): Promise<LandMapData> => {
      if (role === 'executive') {
        const record = await loadExecutiveParcel(landId!)
        let photos: LandPhoto[] = []
        try {
          photos = await loadLandPhotos(landId!)
        } catch {
          // Photos RLS may lag behind map access; still show Uber / Open in maps.
          photos = []
        }

        return {
          land: record,
          photos,
          boundary: parseBoundaryGeoJson(record.boundary_geojson),
        }
      }

      const { data: land, error: landError } = await supabase
        .from('land_records')
        .select(LAND_MAP_COLUMNS)
        .eq('id', landId!)
        .single()

      if (landError || !land) {
        throw landError ?? new Error('Land record not found')
      }

      const record = land as LandMapRecord
      return {
        land: record,
        photos: await loadLandPhotos(landId!),
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
