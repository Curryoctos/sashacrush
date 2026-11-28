export type LandFolderId =
  | 'overview'
  | 'documents'
  | 'messages'
  | 'payments'
  | 'photos'
  | 'investments'
  | 'suggestions'
  | 'edit'

export const LAND_FOLDER_ORDER: LandFolderId[] = [
  'overview',
  'documents',
  'messages',
  'payments',
  'photos',
  'investments',
  'suggestions',
  'edit',
]

export const LAND_FOLDER_LABELS: Record<LandFolderId, string> = {
  overview: 'Overview',
  documents: 'Documents',
  messages: 'Messages',
  payments: 'Purchases',
  photos: 'Field photos',
  investments: 'Investments',
  suggestions: 'Suggestions',
  edit: 'Edit details',
}

export const LAND_FOLDER_DESCRIPTIONS: Record<LandFolderId, string> = {
  overview: 'Deal value, seller, and activity summary',
  documents: 'Upload, send, and track signing',
  messages: 'Seller channel conversation',
  payments: 'Purchases on the linked funding project',
  photos: 'Camera GPS within 10m; library uploads use the land site',
  investments: 'Invest toward this deal — funds capital pool',
  suggestions: 'Propose ideas for this land deal',
  edit: 'Title, location, seller, and status',
}

export function isLandFolder(value: string | null | undefined): value is LandFolderId {
  return (
    value === 'overview' ||
    value === 'documents' ||
    value === 'messages' ||
    value === 'payments' ||
    value === 'photos' ||
    value === 'investments' ||
    value === 'suggestions' ||
    value === 'edit'
  )
}
