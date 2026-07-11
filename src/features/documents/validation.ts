import {
  ALLOWED_MIME_TYPES,
  ALREADY_SIGNED_ERROR,
  MAX_FILE_SIZE_BYTES,
  SIGNABLE_MIME_TYPES,
} from '@/types/documents'

export const FILE_TYPE_ERROR = 'Only PDF, DOCX, PNG, and JPG files accepted'
export const FILE_SIZE_ERROR = 'File must be under 50MB'
export const NOT_SIGNABLE_ERROR =
  'Only PDF, PNG, and JPG documents can be sent for signing. Convert DOCX to PDF first.'
export { ALREADY_SIGNED_ERROR }

export function validateFileType(mimeType: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)
}

export function canSendForSigning(mimeType: string): boolean {
  return (SIGNABLE_MIME_TYPES as readonly string[]).includes(mimeType)
}

export function validateFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE_BYTES
}

export function assertCanSignDocument(status: string): void {
  if (status === 'signed') {
    throw new Error(ALREADY_SIGNED_ERROR)
  }
}
