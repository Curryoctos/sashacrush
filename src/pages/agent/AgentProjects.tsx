import { PageHeader } from '@/components/ui/PageHeader'
import { ProjectsPortfolioPanel } from '@/features/projects/components/ProjectsPortfolioPanel'

/** Agent / investor view of funding projects. */
export function AgentProjectsPage() {
  return (
    <div className="ui-page">
      <PageHeader
        title="Support a project"
        description="Browse public projects and any private ones you participate in. Supporting a project raises that project’s goal — it does not add to the company capital pool."
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
