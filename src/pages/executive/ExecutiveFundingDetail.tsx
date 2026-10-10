import { useParams } from 'react-router-dom'
import { ProjectPortfolioDetail } from '@/features/projects/components/ProjectPortfolioDetail'

export function ExecutiveFundingDetailPage() {
  const { slug = '' } = useParams()
  return (
    <ProjectPortfolioDetail
      slug={slug}
      backTo="/executive/funding"
      backLabel="Funding projects"
      showContribute={false}
    />
  )
}
