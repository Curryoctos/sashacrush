import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  MAX_PHOTO_SIZE_BYTES,
  PHOTOS_BUCKET,
  PHOTO_MIME_TYPES,
  type LandPhoto,
} from '@/types/photos'

const PHOTO_COLUMNS =
  'id, land_id, uploader_id, file_path, latitude, longitude, captured_at'

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

      return (data ?? []) as LandPhoto[]
    },
  })

  const uploadPhoto = useCallback(
    async (
      file: File,
      targetLandId: string,
      coords: { latitude: number | null; longitude: number | null },
    ): Promise<LandPhoto> => {
      setActionError(null)

      if (!user) {
        throw new Error('You must be signed in to upload photos.')
      }

      if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
        throw new Error('Only PNG, JPG, and WebP images are accepted.')
      }

      if (file.size > MAX_PHOTO_SIZE_BYTES) {
        throw new Error('Photo must be under 10MB.')
      }

      const objectId = crypto.randomUUID()
      const storagePath = `${targetLandId}/${objectId}-${file.name}`

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
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
        .select(PHOTO_COLUMNS)
        .single()

      if (insertError || !data) {
        await supabase.storage.from(PHOTOS_BUCKET).remove([storagePath])
        throw new Error('Could not save photo record.')
      }

      await queryClient.invalidateQueries({ queryKey: ['photos', targetLandId] })
      return data as LandPhoto
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

function readGeolocation(): Promise<{ latitude: number | null; longitude: number | null }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: null, longitude: null })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      () => resolve({ latitude: null, longitude: null }),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  })
}

export { readGeolocation }
