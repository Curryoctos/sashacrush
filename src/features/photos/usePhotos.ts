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
  'id, land_id, project_id, uploader_id, file_path, latitude, longitude, accuracy_m, captured_at'

export type UsePhotosTarget =
  | string
  | null
  | { landId?: string | null; projectId?: string | null }

function resolvePhotosTarget(target: UsePhotosTarget): {
  landId: string | null
  projectId: string | null
} {
  if (target && typeof target === 'object') {
    return {
      landId: target.landId?.trim() || null,
      projectId: target.projectId?.trim() || null,
    }
  }
  return {
    landId: typeof target === 'string' ? target : null,
    projectId: null,
  }
}

export function usePhotos(target: UsePhotosTarget) {
  const { landId, projectId } = resolvePhotosTarget(target)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)
  const scopeKey = projectId ? `project:${projectId}` : landId ? `land:${landId}` : null

  const photosQuery = useQuery({
    queryKey: ['photos', scopeKey],
    enabled: Boolean(scopeKey && user),
    queryFn: async (): Promise<LandPhoto[]> => {
      let query = supabase
        .from('photos')
        .select(PHOTO_COLUMNS)
        .order('captured_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      } else if (landId) {
        query = query.eq('land_id', landId)
      }

      const { data, error } = await query
      if (error) {
        throw error
      }

      return ((data ?? []) as LandPhoto[]).map(normalizePhoto)
    },
  })

  const uploadPhoto = useCallback(
    async (
      file: File,
      uploadTarget: string | { landId?: string | null; projectId?: string | null },
      capturedAt: string = new Date().toISOString(),
      /** Present for a camera shot. Library uploads omit this and use the land site pin. */
      liveGps?: { latitude: number | null; longitude: number | null; accuracyM?: number | null },
    ): Promise<LandPhoto> => {
      setActionError(null)
      const resolved = resolvePhotosTarget(uploadTarget)

      if (!user) {
        throw new Error('You must be signed in to upload photos.')
      }

      if (!resolved.landId && !resolved.projectId) {
        throw new Error('Select a land deal or project for this photo.')
      }

      if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
        throw new Error('Only PNG, JPG, and WebP images are accepted.')
      }

      if (file.size > MAX_PHOTO_SIZE_BYTES || file.size >= MAX_UPLOAD_BYTES) {
        throw new Error('Photo must be under 500KB.')
      }

      let latitude = liveGps?.latitude ?? null
      let longitude = liveGps?.longitude ?? null

      if (!liveGps && resolved.landId) {
        const { data: land, error: landError } = await supabase
          .from('land_records')
          .select('latitude, longitude')
          .eq('id', resolved.landId)
          .maybeSingle()

        if (landError || !land) {
          throw new Error('Could not read the land site coordinates.')
        }

        latitude = siteCoordinate(land.latitude)
        longitude = siteCoordinate(land.longitude)
      }

      if (!liveGps && !resolved.landId && resolved.projectId) {
        const { data: project } = await supabase
          .from('projects')
          .select('latitude, longitude')
          .eq('id', resolved.projectId)
          .maybeSingle()
        latitude = siteCoordinate(project?.latitude)
        longitude = siteCoordinate(project?.longitude)
      }

      const objectId = crypto.randomUUID()
      const storageScope = resolved.projectId ?? resolved.landId!
      const storagePath = photoObjectPath(storageScope, objectId)

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
          land_id: resolved.landId,
          project_id: resolved.projectId,
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
      const cacheKey = resolved.projectId
        ? `project:${resolved.projectId}`
        : `land:${resolved.landId}`
      queryClient.setQueryData<LandPhoto[]>(['photos', cacheKey], (current) => {
        const existing = current ?? []
        return [photo, ...existing.filter((row) => row.id !== photo.id)]
      })
      if (resolved.landId) {
        void queryClient.invalidateQueries({ queryKey: ['land-map', resolved.landId] })
      }
      return photo
    },
    [queryClient, user],
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
    getPhotoUrl,
    setActionError,
  }
}
