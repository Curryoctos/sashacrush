import { Link } from 'react-router-dom'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { CommunityBoardPage } from '@/pages/community/CommunityBoard'
import { CommunitySchedulePage } from '@/pages/community/CommunitySchedule'

/** Admin moderation entry — board + schedule with pin/delete/create controls. */
export function AdminCommunityPage() {
  return (
    <div className="ui-page max-w-4xl space-y-10">
      <div>
        <PageBackLink to="/admin/pipeline" label="Pipeline" />
        <PageHeader
          className="mt-3"
          eyebrow="Ops"
          title="Community"
          description="Moderate the public board and incubation schedule."
        />
        <p className="mt-3 text-sm text-muted">
          Public:{' '}
          <Link className="underline" to="/community">
            board
          </Link>
          {' · '}
          <Link className="underline" to="/community/schedule">
            schedule
          </Link>
        </p>
      </div>
      <CommunityBoardPage compact />
      <CommunitySchedulePage compact />
    </div>
  )
}
