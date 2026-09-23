export const MEDIA_BUCKET = 'media'
export const MAX_MEDIA_BYTES = 524_288_000 // 500MB
export const MEDIA_MIME_TYPES = ['video/mp4', 'video/quicktime'] as const

export type MediaMimeType = (typeof MEDIA_MIME_TYPES)[number]

export interface MediaVideo {
  id: string
  land_id: string
  uploader_id: string
  title: string
  land_title: string
  file_path: string
  mime_type: MediaMimeType
  size_bytes: number
  captured_at: string
  created_at: string
}

export interface MediaVideoWithMeta extends MediaVideo {
  signed_url: string | null
}

export const MEDIA_COLUMNS =
  'id, land_id, uploader_id, title, land_title, file_path, mime_type, size_bytes, captured_at, created_at'

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B'
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function validateMediaUpload(file: File, title: string, landId: string): string | null {
  if (!landId.trim()) {
    return 'Select a land deal.'
  }
  if (!title.trim()) {
    return 'Title is required.'
  }
  if (!(MEDIA_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'Only MP4 and MOV videos are accepted.'
  }
  if (file.size <= 0 || file.size > MAX_MEDIA_BYTES) {
    return 'Video must be under 500MB.'
  }
  return null
}

export function mediaObjectPath(landId: string, fileName: string): string {
  const safe = fileName.replace(/[^\w.\-]+/g, '_').slice(0, 80)
  return `${landId}/${Date.now()}-${safe}`
}
