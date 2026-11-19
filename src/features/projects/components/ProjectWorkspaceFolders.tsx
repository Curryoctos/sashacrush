import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera,
  FileText,
  FolderKanban,
  MessageSquare,
  Video,
  Wallet,
} from 'lucide-react'
import { FolderCards } from '@/components/hierarchy/Hierarchy'
import {
  PROJECT_FOLDER_DESCRIPTIONS,
  PROJECT_FOLDER_LABELS,
  PROJECT_LIBRARY_FOLDER_ORDER,
  projectLibraryPath,
  type ProjectFolderId,
} from '@/features/projects/projectFolders'

const FOLDER_ICONS: Partial<Record<ProjectFolderId, ReactNode>> = {
  documents: <FileText className="h-5 w-5" strokeWidth={1.75} />,
  messages: <MessageSquare className="h-5 w-5" strokeWidth={1.75} />,
  payments: <Wallet className="h-5 w-5" strokeWidth={1.75} />,
  photos: <Camera className="h-5 w-5" strokeWidth={1.75} />,
  media: <Video className="h-5 w-5" strokeWidth={1.75} />,
}

interface ProjectWorkspaceFoldersProps {
  projectId: string
  projectSlug: string
  /** Optional pending purchase count for the Purchases card. */
  pendingPurchases?: number
}

/** Shared library folders connected to a funding project. */
export function ProjectWorkspaceFolders({
  projectId,
  projectSlug,
  pendingPurchases,
}: ProjectWorkspaceFoldersProps) {
  const navigate = useNavigate()

  return (
    <section className="space-y-3">
      <div>
        <h2 className="ui-section-title">Connected libraries</h2>
        <p className="ui-section-desc">
          Documents, messages, purchases, photos, and video for this project —
          the same libraries used across the portal.
        </p>
      </div>
      <FolderCards
        folders={PROJECT_LIBRARY_FOLDER_ORDER.map((folder: ProjectFolderId) => ({
          id: folder,
          title: PROJECT_FOLDER_LABELS[folder],
          description: PROJECT_FOLDER_DESCRIPTIONS[folder],
          icon: FOLDER_ICONS[folder] ?? (
            <FolderKanban className="h-5 w-5" strokeWidth={1.75} />
          ),
          count:
            folder === 'payments' && pendingPurchases != null
              ? pendingPurchases
              : undefined,
          onSelect: () =>
            navigate(projectLibraryPath(projectId, folder, projectSlug)),
        }))}
      />
    </section>
  )
}
