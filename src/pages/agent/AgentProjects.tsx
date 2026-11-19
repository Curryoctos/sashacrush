import { PageHeader } from '@/components/ui/PageHeader'
import { ProjectsPortfolioPanel } from '@/features/projects/components/ProjectsPortfolioPanel'

/** Agent / investor view of funding projects. */
export function AgentProjectsPage() {
  return (
    <div className="ui-page">
      <PageHeader
        title="Funding projects"
        description="Browse public projects and any private ones you participate in. Contribute from the project page."
        backTo="/agent/capital"
        backLabel="Capital"
      />
      <ProjectsPortfolioPanel
        detailBasePath="/agent/projects"
        emptyDescription="Public projects and your participations will show here."
      />
    </div>
  )
}
