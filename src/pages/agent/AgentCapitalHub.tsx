import { FileSignature, PiggyBank } from 'lucide-react'
import { PortalHubPage } from '@/components/hierarchy/PortalHubPage'

export function AgentCapitalHubPage() {
  return (
    <PortalHubPage
      eyebrow="Investing"
      title="Capital"
      description="Invest toward deals and sign agreements before contributing."
      backTo="/agent/dashboard"
      backLabel="Agent Dashboard"
      folders={[
        {
          id: 'investments',
          title: 'Investments',
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
