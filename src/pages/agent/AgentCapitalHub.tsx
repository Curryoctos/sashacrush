import { FileSignature, FolderKanban, PiggyBank } from 'lucide-react'
import { PortalHubPage } from '@/components/hierarchy/PortalHubPage'

export function AgentCapitalHubPage() {
  return (
    <PortalHubPage
      eyebrow="Investing"
      title="Capital"
      description="Land investments fund the company pool for deals. Funding projects are community causes you can contribute to."
      backTo="/agent/dashboard"
      backLabel="Dashboard"
      folders={[
        {
          id: 'projects',
          title: 'Funding projects',
          description: 'Browse causes and contribute as an investor',
          to: '/agent/projects',
          icon: <FolderKanban className="h-5 w-5" />,
        },
        {
          id: 'investments',
          title: 'Land investments',
          description: 'Contribute toward a deal — funds the company pool',
          to: '/agent/investments',
          icon: <PiggyBank className="h-5 w-5" />,
        },
        {
          id: 'agreements',
          title: 'Agreements',
          description: 'Review and sign before investing',
          to: '/agent/agreements',
          icon: <FileSignature className="h-5 w-5" />,
        },
      ]}
    />
  )
}
