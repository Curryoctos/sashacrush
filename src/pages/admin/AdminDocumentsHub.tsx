import { FileSignature, FileText } from 'lucide-react'
import { PortalHubPage } from '@/components/hierarchy/PortalHubPage'

export function AdminDocumentsHubPage() {
  return (
    <PortalHubPage
      eyebrow="Files"
      title="Documents"
      description="Deal signing packs and agent capital agreements."
      backTo="/admin/dashboard"
      backLabel="Admin Dashboard"
      folders={[
        {
          id: 'deal-docs',
          title: 'Deal documents',
          description: 'Upload, send, and track seller signing',
          to: '/admin/documents',
          icon: <FileText className="h-5 w-5" />,
        },
        {
          id: 'agreements',
          title: 'Agent agreements',
          description: 'Capital-pool terms sent to agents before investing',
          to: '/admin/investor-documents',
          icon: <FileSignature className="h-5 w-5" />,
        },
      ]}
    />
  )
}
