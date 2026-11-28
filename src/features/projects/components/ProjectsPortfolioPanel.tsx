import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/PageHeader'
import { ProjectCard } from '@/features/projects/components/ProjectCard'
import { PROJECT_TYPE_LABEL } from '@/features/projects/projectVisuals'
import { useProjects } from '@/features/projects/useProjects'
import { cn } from '@/lib/cn'
import { PROJECT_TYPES, type ProjectType } from '@/types/projects'

interface ProjectsPortfolioPanelProps {
  /** Base path for detail, e.g. /executive/funding or /agent/projects */
  detailBasePath: string
  emptyDescription?: string
}

/** Shared project grid for executive / agent (investor) portals. */
export function ProjectsPortfolioPanel({
  detailBasePath,
  emptyDescription = 'Public and assigned projects will appear here.',
}: ProjectsPortfolioPanelProps) {
  const navigate = useNavigate()
  const [filterType, setFilterType] = useState<ProjectType | ''>('')
  const { projects, isLoading, error } = useProjects(
    filterType ? { type: filterType } : undefined,
  )

  const visible = useMemo(
    () =>
      projects.filter(
        (p) => p.status !== 'cancelled' && p.status !== 'draft',
      ),
    [projects],
  )

  return (
    <div className="space-y-4">
      <div className="ui-segment flex-wrap">
        <button
          type="button"
          onClick={() => setFilterType('')}
          className={cn(
            'ui-segment-item',
            !filterType ? 'ui-segment-item-active' : 'ui-segment-item-idle',
          )}
        >
          All
        </button>
        {PROJECT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilterType(type)}
            className={cn(
              'ui-segment-item',
              filterType === type
                ? 'ui-segment-item-active'
                : 'ui-segment-item-idle',
            )}
          >
            {PROJECT_TYPE_LABEL[type]}
          </button>
        ))}
      </div>

      {error ? (
        <p className="ui-alert-danger" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-[13px] text-muted">Loading projects…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description={emptyDescription}
          action={
            filterType ? (
              <Button variant="secondary" onClick={() => setFilterType('')}>
                Clear filter
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`${detailBasePath}/${project.slug}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
