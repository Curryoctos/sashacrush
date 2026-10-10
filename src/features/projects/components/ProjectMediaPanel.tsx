import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/PageHeader'
import {
  MEDIA_BUCKET,
  MEDIA_COLUMNS,
  formatBytes,
  mediaObjectPath,
  type MediaMimeType,
  type MediaVideo,
  type MediaVideoWithMeta,
} from '@/features/media/constants'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'

interface ProjectMediaPanelProps {
  projectId: string
  projectTitle: string
}

export function ProjectMediaPanel({
  projectId,
  projectTitle,
}: ProjectMediaPanelProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  const videosQuery = useQuery({
    queryKey: ['media-videos', 'project', projectId],
    enabled: Boolean(user && projectId),
    queryFn: async (): Promise<MediaVideoWithMeta[]> => {
      const { data, error } = await supabase
        .from('media_videos')
        .select(MEDIA_COLUMNS)
        .eq('project_id', projectId)
        .order('captured_at', { ascending: false })
      if (error) throw error
      const rows = (data ?? []) as MediaVideo[]
      const withUrls: MediaVideoWithMeta[] = []
      for (const row of rows) {
        const { data: signed } = await supabase.storage
          .from(MEDIA_BUCKET)
          .createSignedUrl(row.file_path, 3600)
        withUrls.push({
          ...row,
          signed_url: signed?.signedUrl ?? null,
        })
      }
      return withUrls
    },
  })

  useEffect(() => {
    setPlayingId(null)
  }, [projectId])

  const onUpload = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || user.role !== 'admin') {
      setFormError('Only admin can upload media.')
      return
    }
    if (!file || !title.trim()) {
      setFormError('Choose a file and enter a title.')
      return
    }
    setBusy(true)
    setFormError(null)
    try {
      const path = mediaObjectPath(projectId, file.name)
      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError

      const { error } = await supabase.from('media_videos').insert({
        land_id: null,
        project_id: projectId,
        uploader_id: user.id,
        title: title.trim(),
        land_title: projectTitle,
        file_path: path,
        mime_type: file.type as MediaMimeType,
        size_bytes: file.size,
        captured_at: new Date().toISOString(),
      })
      if (error) {
        await supabase.storage.from(MEDIA_BUCKET).remove([path])
        throw error
      }
      setTitle('')
      setFile(null)
      await queryClient.invalidateQueries({
        queryKey: ['media-videos', 'project', projectId],
      })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const videos = videosQuery.data ?? []

  return (
    <div className="space-y-4">
      <form onSubmit={(event) => void onUpload(event)} className="ui-panel space-y-3 p-4">
        <p className="text-[13px] font-medium text-ink">Upload project video</p>
        <input
          className="ui-input"
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <input
          type="file"
          accept="video/mp4,video/quicktime"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        {formError ? (
          <p className="ui-alert-danger" role="alert">
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? 'Uploading…' : 'Upload'}
        </Button>
      </form>

      {videosQuery.isLoading ? (
        <p className="text-[13px] text-muted">Loading videos…</p>
      ) : videos.length === 0 ? (
        <EmptyState
          title="No project videos yet"
          description="Upload private MP4/MOV files for this project vault."
        />
      ) : (
        <ul className="space-y-3">
          {videos.map((video) => (
            <li key={video.id} className="ui-panel space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-medium text-ink">{video.title}</p>
                  <p className="text-[11px] text-muted">
                    {formatDate(video.captured_at)} · {formatBytes(video.size_bytes)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setPlayingId((current) =>
                      current === video.id ? null : video.id,
                    )
                  }
                >
                  {playingId === video.id ? 'Hide' : 'Play'}
                </Button>
              </div>
              {playingId === video.id && video.signed_url ? (
                <video
                  className="w-full rounded-lg bg-ink"
                  controls
                  src={video.signed_url}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
