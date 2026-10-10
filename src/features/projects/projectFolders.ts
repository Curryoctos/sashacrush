/** Workspace libraries attached to a funding project (mirrors land deal folders). */
export type ProjectFolderId =
  | 'overview'
  | 'documents'
  | 'messages'
  | 'payments'
  | 'photos'
  | 'media'
  | 'participants'
  | 'updates'

export const PROJECT_WORKSPACE_FOLDER_ORDER: ProjectFolderId[] = [
  'overview',
  'documents',
  'messages',
  'payments',
  'photos',
  'media',
  'participants',
  'updates',
]

/** Folders that deep-link into shared admin libraries. */
export const PROJECT_LIBRARY_FOLDER_ORDER: ProjectFolderId[] = [
  'documents',
  'messages',
  'payments',
  'photos',
  'media',
]

export const PROJECT_FOLDER_LABELS: Record<ProjectFolderId, string> = {
  overview: 'Overview',
  documents: 'Documents',
  messages: 'Messages',
  payments: 'Purchases',
  photos: 'Field photos',
  media: 'Video vault',
  participants: 'Participants',
  updates: 'Updates',
}

export const PROJECT_FOLDER_DESCRIPTIONS: Record<ProjectFolderId, string> = {
  overview: 'Cause, goal, and funding progress',
  documents: 'Upload and track project documents',
  messages: 'Staff conversation for this project',
  payments: 'Purchases and disbursements — linked land stays in context',
  photos: 'Site and progress photos for this project',
  media: 'Private video vault tied to this project',
  participants: 'Investors, counterparts, and collaborators',
  updates: 'Public progress updates and milestones',
}

export function isProjectFolder(
  value: string | null | undefined,
): value is ProjectFolderId {
  return (
    value === 'overview' ||
    value === 'documents' ||
    value === 'messages' ||
    value === 'payments' ||
    value === 'photos' ||
    value === 'media' ||
    value === 'participants' ||
    value === 'updates'
  )
}

/** Deep-link into the shared library page for this project. */
export function projectLibraryPath(
  projectId: string,
  folder: ProjectFolderId,
  projectSlug?: string,
): string {
  const q = `project=${encodeURIComponent(projectId)}`
  switch (folder) {
    case 'documents':
      return `/admin/documents?${q}`
    case 'messages':
      return `/admin/chat?${q}`
    case 'payments':
      return `/admin/payments?${q}`
    case 'photos':
      return `/admin/photos?${q}&folder=gallery`
    case 'media':
      return `/admin/media?${q}`
    case 'participants':
    case 'updates':
    case 'overview':
      return projectSlug
        ? `/admin/funding/${encodeURIComponent(projectSlug)}`
        : `/admin/funding`
    default:
      return `/admin/payments?${q}`
  }
}
