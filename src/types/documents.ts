export type DocumentStatus = 'draft' | 'sent' | 'signed' | 'archived'

export interface Document {
  id: string
  land_id: string
  uploader_id: string
  assigned_to: string | null
  signed_by: string | null
  file_path: string | null
  title: string | null
  status: DocumentStatus
  signature_hash: string | null
  signed_at: string | null
  created_at: string
}

export const DOCUMENT_BUCKET = 'documents'

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

export const FILE_TYPE_ERROR = 'Only PDF, DOCX, PNG, and JPG files accepted'
export const FILE_SIZE_ERROR = 'File must be under 50MB'
export const UPLOAD_FAILED_ERROR = 'Upload failed. Please try again.'
export const ALREADY_SIGNED_ERROR =
  'Document already signed and cannot be modified'
