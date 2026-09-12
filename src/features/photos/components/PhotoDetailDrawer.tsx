import { useEffect, useState } from 'react'
import { ExternalLink, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import type { LandPhoto } from '@/types/photos'

interface PhotoDetailDrawerProps {
  photo: LandPhoto | null
  landTitle?: string
  previewUrl?: string
  getPhotoUrl: (path: string) => Promise<string>
  uploading?: boolean
  outsideBoundary?: boolean
  onClose: () => void
  onViewOnMap?: () => void
}

function formatWhen(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function mapsUrl(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`
}

export function PhotoDetailDrawer({
  photo,
  landTitle,
  previewUrl,
  getPhotoUrl,
  uploading = false,
  outsideBoundary = false,
  onClose,
  onViewOnMap,
}: PhotoDetailDrawerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(previewUrl ?? null)

  useEffect(() => {
    if (!photo) {
      setImageUrl(null)
      return
    }
    if (previewUrl) {
      setImageUrl(previewUrl)
      return
    }
    if (!photo.file_path) {
      setImageUrl(null)
      return
    }

    let cancelled = false
    void getPhotoUrl(photo.file_path)
      .then((url) => {
        if (!cancelled) {
          setImageUrl(url)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setImageUrl(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [photo, previewUrl, getPhotoUrl])

  if (!photo) {
    return null
  }

  const hasGps = photo.latitude != null && photo.longitude != null
  const pending =
    photo.id.startsWith('local-') || uploading || (!hasGps && uploading)

  return (
    <Drawer
      open
      title="Field photo"
      description={landTitle ? `Deal · ${landTitle}` : undefined}
      onClose={onClose}
      footer={
        hasGps ? (
          <div className="flex flex-wrap gap-2">
            {onViewOnMap ? (
              <Button type="button" variant="secondary" size="sm" onClick={onViewOnMap}>
                <MapPin className="h-4 w-4" aria-hidden />
                Show on map
              </Button>
            ) : null}
            <a
              href={mapsUrl(photo.latitude!, photo.longitude!)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex"
            >
              <Button type="button" size="sm">
                <ExternalLink className="h-4 w-4" aria-hidden />
                Open in maps
              </Button>
            </a>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Field capture"
              className="max-h-[22rem] w-full object-contain bg-ink/5"
            />
          ) : (
            <div className="flex h-56 items-center justify-center text-sm text-muted">
              Loading preview…
            </div>
          )}
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Location
            </h3>
            {outsideBoundary ? (
              <Badge tone="danger">Outside parcel</Badge>
            ) : hasGps ? (
              <Badge tone="success">GPS tagged</Badge>
            ) : pending ? (
              <Badge tone="warning">Attaching GPS…</Badge>
            ) : (
              <Badge tone="neutral">No GPS</Badge>
            )}
          </div>

          {outsideBoundary ? (
            <p className="text-sm text-danger">
              This pin sits outside the saved parcel. The GPS fix may be wrong.
            </p>
          ) : null}
          {hasGps ? (
            <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-white p-3 text-sm">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Latitude
                </dt>
                <dd className="mt-1 font-medium tabular-nums text-ink">
                  {photo.latitude!.toFixed(6)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Longitude
                </dt>
                <dd className="mt-1 font-medium tabular-nums text-ink">
                  {photo.longitude!.toFixed(6)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted">
              {pending
                ? 'The photo is saved. Coordinates will appear here once GPS locks in.'
                : 'This capture has no coordinates yet.'}
            </p>
          )}
        </section>

        <section className="space-y-2 text-sm">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Capture
          </h3>
          <p>
            <span className="text-muted">Taken · </span>
            {formatWhen(photo.captured_at)}
          </p>
        </section>
      </div>
    </Drawer>
  )
}
