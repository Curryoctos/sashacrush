export type LandFolderId =
  | 'overview'
  | 'documents'
  | 'messages'
  | 'payments'
  | 'photos'
  | 'edit'

export const LAND_FOLDER_ORDER: LandFolderId[] = [
  'overview',
  'documents',
  'messages',
  'payments',
  'photos',
  'edit',
]

export const LAND_FOLDER_LABELS: Record<LandFolderId, string> = {
  overview: 'Overview',
  documents: 'Documents',
  messages: 'Messages',
  payments: 'Payments',
  photos: 'Field photos',
  edit: 'Edit details',
}

export const LAND_FOLDER_DESCRIPTIONS: Record<LandFolderId, string> = {
  overview: 'Deal value, seller, and activity summary',
  documents: 'Upload, send, and track signing',
  messages: 'Seller channel conversation',
  payments: 'Confirm and track deal payments',
  photos: 'GPS-tagged field photos',
  edit: 'Title, location, seller, and status',
}

export function isLandFolder(value: string | null | undefined): value is LandFolderId {
  return (
    value === 'overview' ||
    value === 'documents' ||
    value === 'messages' ||
    value === 'payments' ||
    value === 'photos' ||
    value === 'edit'
  )
}
