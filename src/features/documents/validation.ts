import {
  ALLOWED_MIME_TYPES,
  ALREADY_SIGNED_ERROR,
  MAX_FILE_SIZE_BYTES,
} from '@/types/documents'

export const FILE_TYPE_ERROR = 'Only PDF, DOCX, PNG, and JPG files accepted'
export const FILE_SIZE_ERROR = 'File must be under 50MB'
export { ALREADY_SIGNED_ERROR }

export function validateFileType(mimeType: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)
}

export function validateFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE_BYTES
}

export function assertCanSignDocument(status: string): void {
  if (status === 'signed') {
    throw new Error(ALREADY_SIGNED_ERROR)
  }
}
