import { FolderKanban, Landmark, Wallet } from 'lucide-react'
import { PortalHubPage } from '@/components/hierarchy/PortalHubPage'

export function AdminFinanceHubPage() {
  return (
    <PortalHubPage
      eyebrow="Money"
      title="Finance"
      description="Raise capital → pay sellers → optional crypto. Money in funds money out."
      backTo="/admin/dashboard"
      backLabel="Dashboard"
      folders={[
        {
          id: 'capital',
          title: 'Capital pool',
          description:
            'Agent money into the company. Available balance is what you can pay sellers.',
          to: '/admin/capital',
          icon: <Landmark className="h-5 w-5" />,
        },
        {
          id: 'payments',
          title: 'Seller payouts',
          description:
            'Send deal funds to sellers (MoMo, wire/WU, or manual). Uses capital available.',
          to: '/admin/payments',
          icon: <FolderKanban className="h-5 w-5" />,
        },
        {
          id: 'wallet',
          title: 'Crypto pay (optional)',
          description:
            'Convert crypto from a connected wallet into a deal payment — only if treasury is configured.',
          to: '/admin/wallet',
          icon: <Wallet className="h-5 w-5" />,
        },
      ]}
    />
  )
}
