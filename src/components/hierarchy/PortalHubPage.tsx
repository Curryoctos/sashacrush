import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { FolderCards, type FolderCardItem } from '@/components/hierarchy/Hierarchy'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'

export interface HubFolder {
  id: string
  title: string
  description: string
  to: string
  icon: ReactNode
  count?: number | string
}

interface PortalHubPageProps {
  eyebrow: string
  title: string
  description: string
  backTo: string
  backLabel: string
  folders: HubFolder[]
}

/** Side-nav parent destination: pick a child area via FolderCards. */
export function PortalHubPage({
  eyebrow,
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
    <div className="ui-page max-w-4xl">
      <div>
        <PageBackLink to={backTo} label={backLabel} />
        <PageHeader
          className="mt-3"
          eyebrow={eyebrow}
          title={title}
          description={description}
        />
      </div>
      <FolderCards folders={cards} />
    </div>
  )
}
