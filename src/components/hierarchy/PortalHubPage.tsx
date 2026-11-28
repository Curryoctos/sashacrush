import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  FolderCards,
  type FolderCardItem,
} from '@/components/hierarchy/Hierarchy'
import { PageHeader } from '@/components/ui/PageHeader'

export interface HubFolder {
  id: string
  title: string
  description: string
  to: string
  icon: ReactNode
  count?: number | string
}

interface PortalHubPageProps {
  /** @deprecated Not rendered — kept for call-site compat. */
  eyebrow?: string
  title: string
  description?: string
  backTo: string
  backLabel: string
  folders: HubFolder[]
}

/** Side-nav parent destination: pick a child area via FolderCards. */
export function PortalHubPage({
  title,
  description,
  backTo,
  backLabel,
  folders,
}: PortalHubPageProps) {
  const navigate = useNavigate()

  const cards: FolderCardItem[] = folders.map((folder) => ({
    id: folder.id,
    title: folder.title,
    description: folder.description,
    icon: folder.icon,
    count: folder.count,
    onSelect: () => navigate(folder.to),
  }))

  return (
    <div className="ui-page">
      <PageHeader
        title={title}
        description={description}
        backTo={backTo}
        backLabel={backLabel}
      />
      <FolderCards folders={cards} />
    </div>
  )
}
