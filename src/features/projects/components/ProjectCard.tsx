import { Badge } from '@/components/ui/Badge'
import { fundingPercentage } from '@/features/projects/projectUtils'
import {
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_ICON,
  PROJECT_TYPE_LABEL,
  PROJECT_TYPE_SURFACE,
  projectStatusTone,
} from '@/features/projects/projectVisuals'
import { formatDate, formatUsd } from '@/lib/formatters'
import { cn } from '@/lib/cn'
import type { Project } from '@/types/projects'

interface ProjectCardProps {
  project: Project
  onClick: () => void
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const Icon = PROJECT_TYPE_ICON[project.type]
  const goal = Number(project.funding_goal_usd ?? 0)
  const raised = Number(project.funding_raised_usd ?? 0)
  const pct = fundingPercentage(raised, goal)

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated text-left transition hover:bg-hover"
    >
      <div className="relative h-36 w-full overflow-hidden">
        {project.cover_image_path ? (
          <img
            src={project.cover_image_path}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center',
              PROJECT_TYPE_SURFACE[project.type],
            )}
          >
            <Icon className="h-10 w-10 text-muted" strokeWidth={1.5} aria-hidden />
          </div>
        )}
        <span className="absolute right-2 top-2">
          <Badge tone="brand">{PROJECT_TYPE_LABEL[project.type]}</Badge>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-[15px] font-medium tracking-tight text-ink">
          {project.title}
        </h3>
        <p className="text-[12px] text-muted">
          {[project.location_name, project.country].filter(Boolean).join(', ')}
        </p>
        {project.cause ? (
          <p className="line-clamp-2 text-[12px] text-muted">{project.cause}</p>
        ) : null}

        <div className="mt-auto space-y-1.5 pt-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-ink transition-all"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <span className="text-[11px] font-medium tabular-nums text-muted">
              {pct.toFixed(0)}%
            </span>
          </div>
          <p className="text-[11px] text-muted">
            {formatUsd(raised)} raised of {formatUsd(goal)} goal
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Badge tone={projectStatusTone(project.status)}>
            {PROJECT_STATUS_LABEL[project.status]}
          </Badge>
          {project.target_date ? (
            <span className="text-[11px] text-muted">
              Target {formatDate(project.target_date)}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  )
}
