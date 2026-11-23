import { useParams } from 'react-router-dom'
import { ProjectPortfolioDetail } from '@/features/projects/components/ProjectPortfolioDetail'

export function AgentProjectDetailPage() {
  const { slug = '' } = useParams()
  return (
    <ProjectPortfolioDetail
      slug={slug}
      backTo="/agent/projects"
      backLabel="Support a project"
      showContribute
    />
  )
}
