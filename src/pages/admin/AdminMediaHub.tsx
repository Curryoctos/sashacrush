import { Camera, Video } from 'lucide-react'
import { PortalHubPage } from '@/components/hierarchy/PortalHubPage'

export function AdminMediaHubPage() {
  return (
    <PortalHubPage
      eyebrow="Library"
      title="Media"
      description="Field photos from site visits and the private video vault."
      backTo="/admin/dashboard"
      backLabel="Admin Dashboard"
      folders={[
        {
          id: 'photos',
          title: 'Field photos',
          description: 'GPS camera captures tied to land deals',
          to: '/admin/photos',
          icon: <Camera className="h-5 w-5" />,
        },
        {
          id: 'vault',
          title: 'Video vault',
          description: 'Private MP4/MOV uploads for staff playback',
          to: '/admin/media',
          icon: <Video className="h-5 w-5" />,
        },
      ]}
    />
  )
}
