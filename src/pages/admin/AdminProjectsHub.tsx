import { Banknote, FolderKanban, Landmark } from 'lucide-react'
import { PortalHubPage } from '@/components/hierarchy/PortalHubPage'

/** Projects hub — funding catalog, purchases, and land deal workspaces. */
export function AdminProjectsHubPage() {
  return (
    <PortalHubPage
      title="Projects"
      description="Funding projects hold money and libraries. Land records hold the deal site and seller workspace. Link a land deal to a project so purchases stay in context."
      backTo="/admin/dashboard"
      backLabel="Dashboard"
      folders={[
        {
          id: 'funding',
          title: 'Funding projects',
          description:
            'Causes and capital — link a land deal when the project buys land',
          to: '/admin/funding',
          icon: <FolderKanban className="h-5 w-5" strokeWidth={1.75} />,
        },
        {
          id: 'purchases',
          title: 'Purchases',
          description:
            'Disbursements against a project (and its linked land when set)',
          to: '/admin/payments',
          icon: <Banknote className="h-5 w-5" strokeWidth={1.75} />,
        },
        {
          id: 'land-records',
          title: 'Land records',
          description:
            'Deal folders, maps, seller chat — purchases open the linked project',
          to: '/admin/land-records',
          icon: <Landmark className="h-5 w-5" strokeWidth={1.75} />,
        },
      ]}
    />
  )
}
