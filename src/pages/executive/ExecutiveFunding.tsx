import { PageHeader } from '@/components/ui/PageHeader'
import { ProjectsPortfolioPanel } from '@/features/projects/components/ProjectsPortfolioPanel'

export function ExecutiveFundingPage() {
  return (
    <div className="ui-page">
      <PageHeader
        title="Funding projects"
        description="All active and public projects — read-only portfolio view."
        backTo="/executive/portfolio"
        backLabel="Portfolio"
      />
      <ProjectsPortfolioPanel
        detailBasePath="/executive/funding"
        emptyDescription="When admin publishes projects, they appear here for executives."
      />
    </div>
  )
}
