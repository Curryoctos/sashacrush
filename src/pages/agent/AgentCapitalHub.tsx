import { FileSignature, FolderKanban, PiggyBank } from 'lucide-react'
import { PortalHubPage } from '@/components/hierarchy/PortalHubPage'

export function AgentCapitalHubPage() {
  return (
    <PortalHubPage
      eyebrow="Investing"
      title="Capital"
      description="Two different money paths: fund company deal capital, or support a public project’s own fundraising goal."
      backTo="/agent/dashboard"
      backLabel="Dashboard"
      folders={[
        {
          id: 'investments',
          title: 'Fund deal capital',
          description:
            'Invest toward a land deal — confirmed funds go into the company capital pool used for seller payouts.',
          to: '/agent/investments',
          icon: <PiggyBank className="h-5 w-5" />,
        },
        {
          id: 'projects',
          title: 'Support a project',
          description:
            'Public/community fundraising — raises that project’s goal total (not the company payout pool).',
          to: '/agent/projects',
          icon: <FolderKanban className="h-5 w-5" />,
        },
        {
          id: 'agreements',
          title: 'Agreements',
          description: 'Review and sign before funding deal capital',
          to: '/agent/agreements',
          icon: <FileSignature className="h-5 w-5" />,
        },
      ]}
    />
  )
}
