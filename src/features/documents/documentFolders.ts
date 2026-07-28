import type { DocumentStatus } from '@/types'

export const DOCUMENT_FOLDER_ORDER: DocumentStatus[] = [
  'sent',
  'draft',
  'signed',
  'archived',
]

export const DOCUMENT_FOLDER_LABELS: Record<DocumentStatus, string> = {
  sent: 'Awaiting Signature',
  draft: 'Drafts',
  signed: 'Signed',
  archived: 'Archived',
}

export const DOCUMENT_FOLDER_DESCRIPTIONS: Record<DocumentStatus, string> = {
  sent: 'Waiting for the seller to sign',
  draft: 'Uploaded but not yet sent',
  signed: 'Completed and locked',
  archived: 'Retired from the active deal',
}

export function isDocumentFolder(value: string | null | undefined): value is DocumentStatus {
  return (
    value === 'sent' ||
    value === 'draft' ||
    value === 'signed' ||
    value === 'archived'
  )
}
