export const PHOTOS_BUCKET = 'photos'

export const PHOTO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024

export interface LandPhoto {
  id: string
  land_id: string
  uploader_id: string
  file_path: string | null
  latitude: number | null
  longitude: number | null
  captured_at: string
}
