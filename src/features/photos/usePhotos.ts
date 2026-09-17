import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { siteCoordinate } from '@/lib/land-records'
import { supabase } from '@/lib/supabase'
import {
  MAX_PHOTO_SIZE_BYTES,
  PHOTOS_BUCKET,
  PHOTO_MIME_TYPES,
  photoAccuracyMeters,
  type LandPhoto,
} from '@/types/photos'
import { MAX_UPLOAD_BYTES, photoObjectPath } from '@/features/photos/captureImage'
import { TARGET_ACCURACY_M } from '@/features/photos/geolocation'
import {
  readGeolocation,
  type GeoCoords,
} from '@/features/photos/geolocation'

/** Persist only a shutter fix that meets the 10m proof-of-site target. */
function normalizePhoto(photo: LandPhoto): LandPhoto {
  return {
    ...photo,
    accuracy_m: photoAccuracyMeters(photo.accuracy_m),
  }
}

function storedAccuracyMeters(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value < 0 || value > TARGET_ACCURACY_M) {
    return null
  }
  return Math.round(value * 10) / 10
}

const PHOTO_COLUMNS =
  'id, land_id, uploader_id, file_path, latitude, longitude, accuracy_m, captured_at'

export function usePhotos(landId: string | null) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)

  const photosQuery = useQuery({
    queryKey: ['photos', landId],
    enabled: Boolean(landId && user),
    queryFn: async (): Promise<LandPhoto[]> => {
      const { data, error } = await supabase
        .from('photos')
        .select(PHOTO_COLUMNS)
        .eq('land_id', landId!)
        .order('captured_at', { ascending: false })

      if (error) {
        throw error
      }

      return ((data ?? []) as LandPhoto[]).map(normalizePhoto)
    },
  })

  const uploadPhoto = useCallback(
    async (
      file: File,
      targetLandId: string,
      capturedAt: string = new Date().toISOString(),
      /** Present for a camera shot. Library uploads omit this and use the land site pin. */
      liveGps?: { latitude: number | null; longitude: number | null; accuracyM?: number | null },
    ): Promise<LandPhoto> => {
      setActionError(null)

      if (!user) {
        throw new Error('You must be signed in to upload photos.')
      }

      if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
        throw new Error('Only PNG, JPG, and WebP images are accepted.')
      }

      if (file.size > MAX_PHOTO_SIZE_BYTES || file.size >= MAX_UPLOAD_BYTES) {
        throw new Error('Photo must be under 500KB.')
      }

      let latitude = liveGps?.latitude ?? null
      let longitude = liveGps?.longitude ?? null

      if (!liveGps) {
        const { data: land, error: landError } = await supabase
          .from('land_records')
          .select('latitude, longitude')
          .eq('id', targetLandId)
          .maybeSingle()

        if (landError || !land) {
          throw new Error('Could not read the land site coordinates.')
        }

        latitude = siteCoordinate(land.latitude)
        longitude = siteCoordinate(land.longitude)
      }

      const objectId = crypto.randomUUID()
      const storagePath = photoObjectPath(targetLandId, objectId)

      const { error: uploadError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        throw new Error('Photo upload failed. Please try again.')
      }

      const { data, error: insertError } = await supabase
        .from('photos')
        .insert({
          land_id: targetLandId,
          uploader_id: user.id,
          file_path: storagePath,
          latitude,
          longitude,
          accuracy_m: liveGps ? storedAccuracyMeters(liveGps.accuracyM) : null,
          captured_at: capturedAt,
        })
        .select(PHOTO_COLUMNS)
        .single()

      if (insertError || !data) {
        await supabase.storage.from(PHOTOS_BUCKET).remove([storagePath])
        throw new Error('Could not save photo record.')
      }

      const photo = normalizePhoto(data as LandPhoto)
      queryClient.setQueryData<LandPhoto[]>(['photos', targetLandId], (current) => {
        const existing = current ?? []
        return [photo, ...existing.filter((row) => row.id !== photo.id)]
      })
      void queryClient.invalidateQueries({ queryKey: ['land-map', targetLandId] })
      return photo
    },
    [queryClient, user],
  )

  const attachPhotoGps = useCallback(
    async (photoId: string, targetLandId: string, coords: GeoCoords): Promise<LandPhoto | null> => {
      if (coords.latitude == null || coords.longitude == null) {
        return null
      }

      const { data, error } = await supabase
        .from('photos')
        .update({
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
        .eq('id', photoId)
        .select(PHOTO_COLUMNS)
        .maybeSingle()

      if (error || !data) {
        return null
      }

      const photo = normalizePhoto(data as LandPhoto)
      queryClient.setQueryData<LandPhoto[]>(['photos', targetLandId], (current) =>
        (current ?? []).map((row) => (row.id === photo.id ? photo : row)),
      )
      void queryClient.invalidateQueries({ queryKey: ['land-map', targetLandId] })
      return photo
    },
    [queryClient],
  )

  /** Refine GPS after upload without blocking the gallery. */
  const refinePhotoGps = useCallback(
    async (photoId: string, targetLandId: string): Promise<GeoCoords> => {
      const coords = await readGeolocation()
      if (coords.latitude != null && coords.longitude != null) {
        await attachPhotoGps(photoId, targetLandId, coords)
      }
      return coords
    },
    [attachPhotoGps],
  )

  const getPhotoUrl = useCallback(async (filePath: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrl(filePath, 3600)

    if (error || !data?.signedUrl) {
      throw new Error('Could not load photo.')
    }

    return data.signedUrl
  }, [])

  return {
    photos: photosQuery.data ?? [],
    isLoading: photosQuery.isLoading,
    error: photosQuery.error ?? actionError,
    uploadPhoto,
    attachPhotoGps,
    refinePhotoGps,
    getPhotoUrl,
    setActionError,
  }
}

export { readGeolocation }
export type { GeoCoords }
