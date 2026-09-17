export const PHOTOS_BUCKET = 'photos'

export const PHOTO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024

/** PostgREST may return numeric columns as strings. */
export function photoAccuracyMeters(value: unknown): number | null {
  if (value == null || value === '') {
    return null
  }
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export interface LandPhoto {
  id: string
  land_id: string
  uploader_id: string
  file_path: string | null
  latitude: number | null
  longitude: number | null
  /** Horizontal GPS accuracy in meters. Set only when a camera fix was within 10m. */
  accuracy_m: number | null
  captured_at: string
}
