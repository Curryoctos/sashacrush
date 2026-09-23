import { Lightbulb, Package, Users } from 'lucide-react'
import { PortalHubPage } from '@/components/hierarchy/PortalHubPage'

export function AdminPipelineHubPage() {
  return (
    <PortalHubPage
      eyebrow="Ops"
      title="Pipeline"
      description="Project proposals, community incubation, and cargo imports."
      backTo="/admin/dashboard"
      backLabel="Admin Dashboard"
      folders={[
        {
          id: 'suggestions',
          title: 'Suggestions',
          description: 'Review and transition project proposals',
          to: '/admin/suggestions',
          icon: <Lightbulb className="h-5 w-5" />,
        },
        {
          id: 'community',
          title: 'Community',
          description: 'Moderate the public board and incubation schedule',
          to: '/admin/community',
          icon: <Users className="h-5 w-5" />,
        },
        {
          id: 'cargo',
          title: 'Cargo',
          description: 'Create shipments and advance import stages',
          to: '/admin/cargo',
          icon: <Package className="h-5 w-5" />,
        },
      ]}
    />
  )
}
