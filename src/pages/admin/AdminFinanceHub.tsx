import { FolderKanban, Landmark, Wallet } from 'lucide-react'
import { PortalHubPage } from '@/components/hierarchy/PortalHubPage'

export function AdminFinanceHubPage() {
  return (
    <PortalHubPage
      eyebrow="Money"
      title="Finance"
      description="Project purchases and disbursements, capital confirmations, and the owner wallet."
      backTo="/admin/dashboard"
      backLabel="Dashboard"
      folders={[
        {
          id: 'payments',
          title: 'Purchases',
          description:
            'Record project purchases and disbursements with a reason, then clear pending payouts',
          to: '/admin/payments',
          icon: <FolderKanban className="h-5 w-5" />,
        },
        {
          id: 'capital',
          title: 'Capital pool',
          description: 'Confirm agent investments into company capital',
          to: '/admin/capital',
          icon: <Landmark className="h-5 w-5" />,
        },
        {
          id: 'wallet',
          title: 'Owner wallet',
          description: 'MetaMask / WalletConnect and convert-and-pay',
          to: '/admin/wallet',
          icon: <Wallet className="h-5 w-5" />,
        },
      ]}
    />
  )
}
