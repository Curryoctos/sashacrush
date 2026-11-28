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
  sent: 'Waiting for the signer to sign',
  draft: 'Uploaded but not yet sent',
  signed: 'Completed and locked',
  archived: 'Retired from the active pipeline',
}

export const INVESTOR_DOCUMENT_FOLDER_DESCRIPTIONS: Record<DocumentStatus, string> = {
  sent: 'Waiting for the investor to sign',
  draft: 'Uploaded but not yet sent to the investor',
  signed: 'Signed by the investor and locked',
  archived: 'Retired from the active pipeline',
}

export function isDocumentFolder(value: string | null | undefined): value is DocumentStatus {
  return (
    value === 'sent' ||
    value === 'draft' ||
    value === 'signed' ||
    value === 'archived'
  )
}
