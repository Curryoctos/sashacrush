import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { CommunityBoardPage } from '@/pages/community/CommunityBoard'
import { CommunitySchedulePage } from '@/pages/community/CommunitySchedule'

/** Admin moderation entry — board + schedule with pin/delete/create controls. */
export function AdminCommunityPage() {
  return (
    <div className="ui-page">
      <PageHeader
        backTo="/admin/pipeline"
        backLabel="Pipeline"
        eyebrow="Ops"
        title="Community"
        description="Moderate the public board and incubation schedule."
      />
      <p className="text-sm text-muted">
        Public:{' '}
        <Link className="underline" to="/community">
          board
        </Link>
        {' · '}
        <Link className="underline" to="/community/schedule">
          schedule
        </Link>
      </p>
      <CommunityBoardPage compact />
      <CommunitySchedulePage compact />
    </div>
  )
}
