import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MEDIA_BUCKET,
  MEDIA_COLUMNS,
  mediaObjectPath,
  validateMediaUpload,
  type MediaMimeType,
  type MediaVideo,
  type MediaVideoWithMeta,
} from '@/features/media/constants'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const SIGNED_URL_SECONDS = 60 * 60 // 1 hour

export function useMediaVault(landIdFilter: string | 'all' = 'all') {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['media-videos', landIdFilter, user?.id],
    enabled: Boolean(user) && (user?.role === 'admin' || user?.role === 'executive'),
    queryFn: async (): Promise<MediaVideoWithMeta[]> => {
      let query = supabase
        .from('media_videos')
        .select(MEDIA_COLUMNS)
        .order('captured_at', { ascending: false })

      if (landIdFilter !== 'all') {
        query = query.eq('land_id', landIdFilter)
      }

      const { data, error } = await query
      if (error) {
        throw error
      }

      const rows = (data ?? []) as MediaVideo[]
      const withUrls: MediaVideoWithMeta[] = []
      for (const row of rows) {
        const { data: signed } = await supabase.storage
          .from(MEDIA_BUCKET)
          .createSignedUrl(row.file_path, SIGNED_URL_SECONDS)
        withUrls.push({
          ...row,
          signed_url: signed?.signedUrl ?? null,
        })
      }
      return withUrls
    },
  })

  const usageQuery = useQuery({
    queryKey: ['media-storage-usage', user?.id],
    enabled: Boolean(user) && user?.role === 'admin',
    queryFn: async (): Promise<{ usedBytes: number; videoCount: number }> => {
      const { data, error } = await supabase.from('media_videos').select('size_bytes')
      if (error) {
        throw error
      }
      const usedBytes = (data ?? []).reduce((sum, row) => sum + Number(row.size_bytes), 0)
      return { usedBytes, videoCount: data?.length ?? 0 }
    },
  })

  const landsQuery = useQuery({
    queryKey: ['media-lands', user?.role],
    enabled: Boolean(user) && user?.role === 'admin',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('land_records')
        .select('id, title')
        .neq('status', 'archived')
        .order('title', { ascending: true })
      if (error) {
        throw error
      }
      return data ?? []
    },
  })

  /** Distinct deals from videos — works for executive without land_records SELECT. */
  const filterLands =
    user?.role === 'admin'
      ? (landsQuery.data ?? [])
      : (() => {
          const map = new Map<string, string>()
          for (const video of listQuery.data ?? []) {
            map.set(video.land_id, video.land_title)
          }
          return [...map.entries()].map(([id, title]) => ({ id, title }))
        })()

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['media-videos'] }),
      queryClient.invalidateQueries({ queryKey: ['media-storage-usage'] }),
    ])
  }, [queryClient])

  const uploadVideo = useCallback(
    async (input: { landId: string; title: string; file: File }): Promise<MediaVideo> => {
      setActionError(null)
      if (!user?.id || user.role !== 'admin') {
        throw new Error('Only admin can upload media.')
      }
      const validationError = validateMediaUpload(input.file, input.title, input.landId)
      if (validationError) {
        setActionError(validationError)
        throw new Error(validationError)
      }

      const land = (landsQuery.data ?? []).find((row) => row.id === input.landId)
      if (!land) {
        throw new Error('Land deal not found.')
      }

      const path = mediaObjectPath(input.landId, input.file.name)
      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, input.file, {
          contentType: input.file.type,
          upsert: false,
        })

      if (uploadError) {
        setActionError(uploadError.message)
        throw uploadError
      }

      const { data, error } = await supabase
        .from('media_videos')
        .insert({
          land_id: input.landId,
          uploader_id: user.id,
          title: input.title.trim(),
          land_title: land.title,
          file_path: path,
          mime_type: input.file.type as MediaMimeType,
          size_bytes: input.file.size,
          captured_at: new Date().toISOString(),
        })
        .select(MEDIA_COLUMNS)
        .single()

      if (error || !data) {
        await supabase.storage.from(MEDIA_BUCKET).remove([path])
        const message = error?.message ?? 'Could not save video record.'
        setActionError(message)
        throw new Error(message)
      }

      await refresh()
      return data as MediaVideo
    },
    [landsQuery.data, refresh, user?.id, user?.role],
  )

  const deleteVideo = useCallback(
    async (video: MediaVideo): Promise<void> => {
      setActionError(null)
      if (user?.role !== 'admin') {
        throw new Error('Only admin can delete media.')
      }
      const { error } = await supabase.from('media_videos').delete().eq('id', video.id)
      if (error) {
        setActionError(error.message)
        throw error
      }
      await supabase.storage.from(MEDIA_BUCKET).remove([video.file_path])
      await refresh()
    },
    [refresh, user?.role],
  )

  return {
    videos: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    error: listQuery.error,
    actionError,
    lands: filterLands,
    landsLoading: landsQuery.isLoading && user?.role === 'admin',
    usage: usageQuery.data ?? null,
    uploadVideo,
    deleteVideo,
    refresh,
  }
}
