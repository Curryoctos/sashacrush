import { FileText, Receipt } from 'lucide-react'
import { PortalHubPage } from '@/components/hierarchy/PortalHubPage'

export function AgentPaperworkHubPage() {
  return (
    <PortalHubPage
      eyebrow="Field ops"
      title="Paperwork"
      description="Deal documents for signing and confirmed payment receipts."
      backTo="/agent/dashboard"
      backLabel="Agent Dashboard"
      folders={[
        {
          id: 'documents',
          title: 'Documents',
          description: 'Upload and send deal files for signing',
          to: '/agent/documents',
          icon: <FileText className="h-5 w-5" />,
        },
        {
          id: 'receipts',
          title: 'Receipts',
          description: 'Confirmed payment receipts for your deals',
          to: '/agent/receipts',
          icon: <Receipt className="h-5 w-5" />,
        },
      ]}
    />
  )
}
