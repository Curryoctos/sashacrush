import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, PageHeader } from '@/components/ui/PageHeader'
import { fundingPercentage } from '@/features/projects/projectUtils'
import {
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
  projectStatusTone,
} from '@/features/projects/projectVisuals'
import { useProject } from '@/features/projects/useProject'
import { formatDate, formatUsd } from '@/lib/formatters'

interface ProjectPortfolioDetailProps {
  slug: string
  backTo: string
  backLabel: string
  /** Show public contribute CTA (agents / investors). */
  showContribute?: boolean
}

/** Read-only project detail for executive and agent portals. */
export function ProjectPortfolioDetail({
  slug,
  backTo,
  backLabel,
  showContribute = false,
}: ProjectPortfolioDetailProps) {
  const { project, participants, updates, milestones, isLoading, error } =
    useProject(slug)

  if (isLoading) {
    return (
      <div className="ui-page">
        <p className="text-[13px] text-muted">Loading project…</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="ui-page">
        <EmptyState
          title="Project not found"
          description={
            error ?? 'This project is private or you do not have access.'
          }
          action={
            <Link to={backTo}>
              <Button variant="secondary">Back</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const goal = Number(project.funding_goal_usd ?? 0)
  const raised = Number(project.funding_raised_usd ?? 0)
  const pct = fundingPercentage(raised, goal)
  const completed = milestones.filter((m) => m.status === 'completed').length

  return (
    <div className="ui-page">
      <PageHeader
        title={project.title}
        description={`${PROJECT_TYPE_LABEL[project.type]} · ${project.visibility}`}
        backTo={backTo}
        backLabel={backLabel}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={projectStatusTone(project.status)}>
              {PROJECT_STATUS_LABEL[project.status]}
            </Badge>
            {showContribute ? (
              <Link to={`/projects/${project.slug}`}>
                <Button size="sm">Contribute</Button>
              </Link>
            ) : (
              <Link to={`/projects/${project.slug}`}>
                <Button size="sm" variant="secondary">
                  Public page
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <section className="ui-panel grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
        <div>
          <p className="ui-stat-label">Goal</p>
          <p className="mt-2 text-[22px] font-semibold tracking-tight tabular-nums text-ink">
            {formatUsd(goal)}
          </p>
        </div>
        <div>
          <p className="ui-stat-label">Raised</p>
          <p className="mt-2 text-[22px] font-semibold tracking-tight tabular-nums text-ink">
            {formatUsd(raised)}
          </p>
        </div>
        <div>
          <p className="ui-stat-label">Funded</p>
          <p className="mt-2 text-[22px] font-semibold tracking-tight tabular-nums text-ink">
            {pct.toFixed(1)}%
          </p>
        </div>
      </section>

      <section className="ui-panel space-y-3 p-5 sm:p-6">
        <h2 className="ui-section-title">About</h2>
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
          {project.description}
        </p>
        {project.cause ? (
          <p className="text-[13px] italic text-muted">{project.cause}</p>
        ) : null}
        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          <MapPin className="h-3.5 w-3.5" />
          {[project.location_name, project.country].filter(Boolean).join(', ')}
        </p>
      </section>

      <section className="ui-panel space-y-3 p-5 sm:p-6">
        <h2 className="ui-section-title">
          Participants ({participants.length})
        </h2>
        {participants.length === 0 ? (
          <p className="text-[13px] text-muted">No participants listed yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 py-2 text-[13px]"
              >
                <span className="font-medium text-ink">
                  {p.profile?.full_name ?? p.profile?.email ?? 'Member'}
                </span>
                <span className="capitalize text-muted">{p.role}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ui-panel space-y-3 p-5 sm:p-6">
        <h2 className="ui-section-title">
          Milestones ({completed}/{milestones.length})
        </h2>
        {milestones.length === 0 ? (
          <p className="text-[13px] text-muted">No milestones yet.</p>
        ) : (
          <ul className="space-y-2">
            {milestones.map((m) => (
              <li key={m.id} className="text-[13px]">
                <span className="font-medium text-ink">{m.title}</span>
                <span className="text-muted"> · {m.status}</span>
                {m.target_date ? (
                  <span className="text-muted">
                    {' '}
                    · {formatDate(m.target_date)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ui-panel space-y-3 p-5 sm:p-6">
        <h2 className="ui-section-title">Updates ({updates.length})</h2>
        {updates.length === 0 ? (
          <p className="text-[13px] text-muted">No updates posted yet.</p>
        ) : (
          <ul className="space-y-3">
            {updates.slice(0, 8).map((u) => (
              <li key={u.id}>
                <p className="text-[13px] font-medium text-ink">{u.title}</p>
                <p className="text-[11px] text-muted">
                  {formatDate(u.created_at)} · {u.update_type}
                </p>
                <p className="mt-1 line-clamp-3 text-[13px] text-muted">
                  {u.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
