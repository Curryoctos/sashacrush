import { FolderKanban, Landmark } from 'lucide-react'
import { PortalHubPage } from '@/components/hierarchy/PortalHubPage'

/** Executive portfolio: land deals + funding projects. */
export function ExecutivePortfolioHubPage() {
  return (
    <PortalHubPage
      title="Portfolio"
      description="Land deals are the site and seller side. Funding projects are capital and community progress — link them when a project buys a deal."
      backTo="/executive/dashboard"
      backLabel="Dashboard"
      folders={[
        {
          id: 'deals',
          title: 'Land deals',
          description: 'High-level deal status — no field tools',
          to: '/executive/deals',
          icon: <Landmark className="h-5 w-5" strokeWidth={1.75} />,
        },
        {
          id: 'funding',
          title: 'Funding projects',
          description: 'Causes, progress, and participant activity',
          to: '/executive/funding',
          icon: <FolderKanban className="h-5 w-5" strokeWidth={1.75} />,
        },
      ]}
    />
  )
}
