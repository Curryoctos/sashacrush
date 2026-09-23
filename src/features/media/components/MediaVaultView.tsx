import { useMemo, useState, type FormEvent } from 'react'
import { Film } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, Stat } from '@/components/ui/Card'
import { EmptyState, PageHeader } from '@/components/ui/PageHeader'
import { formatBytes, MAX_MEDIA_BYTES } from '@/features/media/constants'
import { useMediaVault } from '@/features/media/useMediaVault'
import { notifyInfo, notifySuccess } from '@/features/notifications/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/formatters'
import { formatSupabaseError } from '@/lib/supabase-errors'

interface MediaVaultViewProps {
  canUpload: boolean
}

export function MediaVaultView({ canUpload }: MediaVaultViewProps) {
  const { user } = useAuth()
  const [landFilter, setLandFilter] = useState<string | 'all'>('all')
  const {
    videos,
    isLoading,
    error,
    lands,
    landsLoading,
    usage,
    uploadVideo,
    deleteVideo,
  } = useMediaVault(landFilter)

  const [title, setTitle] = useState('')
  const [landId, setLandId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<string, typeof videos>()
    for (const video of videos) {
      const key = video.land_id
      const list = map.get(key) ?? []
      list.push(video)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [videos])

  const onUpload = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) {
      setFormError('Choose an MP4 or MOV file.')
      return
    }
    setBusy(true)
    setFormError(null)
    try {
      await uploadVideo({ landId, title, file })
      notifySuccess('Video uploaded.')
      setTitle('')
      setFile(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.'
      setFormError(message)
      notifyInfo(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ui-page max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Media vault"
        title="Video & media"
        description={
          user?.email
            ? `Signed in as ${user.email}. Private storage with signed-URL playback.`
            : 'Private storage with signed-URL playback.'
        }
      />

      {canUpload && usage ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Videos stored" value={String(usage.videoCount)} />
          <Stat
            label="Storage used (of 500MB/file cap)"
            value={`${formatBytes(usage.usedBytes)} · max ${formatBytes(MAX_MEDIA_BYTES)} / file`}
          />
        </div>
      ) : null}

      {canUpload ? (
        <Card>
          <CardHeader
            title="Upload video"
            description="MP4 or MOV, max 500MB. Organised by land deal and date."
          />
          <form className="space-y-4" onSubmit={(event) => void onUpload(event)}>
            <label className="block space-y-1.5">
              <span className="ui-label">Land deal</span>
              <select
                className="ui-input"
                value={landId}
                disabled={busy || landsLoading}
                onChange={(event) => setLandId(event.target.value)}
                required
              >
                <option value="">{landsLoading ? 'Loading…' : 'Select a deal…'}</option>
                {lands.map((land) => (
                  <option key={land.id} value={land.id}>
                    {land.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="ui-label">Title</span>
              <input
                className="ui-input"
                value={title}
                disabled={busy}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="ui-label">File</span>
              <input
                className="ui-input"
                type="file"
                accept="video/mp4,video/quicktime,.mp4,.mov"
                disabled={busy}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
              />
            </label>
            {formError ? (
              <p className="ui-alert-danger" role="alert">
                {formError}
              </p>
            ) : null}
            <Button type="submit" disabled={busy}>
              {busy ? 'Uploading…' : 'Upload video'}
            </Button>
          </form>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1.5">
          <span className="ui-label">Filter by deal</span>
          <select
            className="ui-input min-w-[14rem]"
            value={landFilter}
            onChange={(event) => setLandFilter(event.target.value)}
          >
            <option value="all">All deals</option>
            {lands.map((land) => (
              <option key={land.id} value={land.id}>
                {land.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? <p className="text-sm text-muted">Loading media…</p> : null}
      {error ? (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      ) : null}

      {!isLoading && !error && videos.length === 0 ? (
        <EmptyState title="No videos yet." description="Admin can upload MP4 or MOV site recordings." />
      ) : null}

      {grouped.map(([groupLandId, groupVideos]) => (
        <section key={groupLandId} className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">
            {groupVideos[0]?.land_title ?? 'Land deal'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {groupVideos.map((video) => (
              <Card key={video.id} padding="sm">
                <div className="overflow-hidden rounded-md bg-ink/90">
                  {playingId === video.id && video.signed_url ? (
                    <video
                      className="aspect-video w-full bg-black"
                      controls
                      playsInline
                      src={video.signed_url}
                      preload="metadata"
                    />
                  ) : (
                    <button
                      type="button"
                      className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-white"
                      onClick={() => setPlayingId(video.id)}
                      disabled={!video.signed_url}
                    >
                      <Film className="h-10 w-10 opacity-80" />
                      <span className="text-sm">
                        {video.signed_url ? 'Play (signed URL)' : 'URL unavailable'}
                      </span>
                    </button>
                  )}
                </div>
                <div className="mt-3 space-y-1">
                  <p className="font-medium text-ink">{video.title}</p>
                  <p className="text-sm text-muted">
                    {formatDate(video.captured_at)} · {formatBytes(video.size_bytes)}
                  </p>
                </div>
                {canUpload ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    className="mt-3"
                    onClick={() => {
                      void (async () => {
                        try {
                          await deleteVideo(video)
                          notifySuccess('Video removed.')
                          if (playingId === video.id) {
                            setPlayingId(null)
                          }
                        } catch (err) {
                          notifyInfo(err instanceof Error ? err.message : 'Could not delete.')
                        }
                      })()
                    }}
                  >
                    Delete
                  </Button>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
