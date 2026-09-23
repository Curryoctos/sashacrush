import { Banknote, Landmark, Wallet } from 'lucide-react'
import { PortalHubPage } from '@/components/hierarchy/PortalHubPage'

export function AdminFinanceHubPage() {
  return (
    <PortalHubPage
      eyebrow="Money"
      title="Finance"
      description="Seller payouts, agent capital confirmations, and the owner wallet."
      backTo="/admin/dashboard"
      backLabel="Admin Dashboard"
      folders={[
        {
          id: 'payments',
          title: 'Payments',
          description: 'Pay out and confirm seller disbursements',
          to: '/admin/payments',
          icon: <Banknote className="h-5 w-5" />,
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
