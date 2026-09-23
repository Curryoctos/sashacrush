import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { CommunityBoardPage } from '@/pages/community/CommunityBoard'
import { CommunitySchedulePage } from '@/pages/community/CommunitySchedule'

/** Admin moderation entry — board + schedule with pin/delete/create controls. */
export function AdminCommunityPage() {
  return (
    <div className="ui-page max-w-4xl space-y-10">
      <div>
        <PageHeader
          eyebrow="Community"
          title="Moderate community"
          description="Pin or delete posts and manage the public incubation schedule."
        />
        <p className="mt-2 text-sm text-muted">
          Public board:{' '}
          <Link className="underline" to="/community">
            /community
          </Link>
        </p>
      </div>
      <CommunityBoardPage />
      <CommunitySchedulePage />
    </div>
  )
}
