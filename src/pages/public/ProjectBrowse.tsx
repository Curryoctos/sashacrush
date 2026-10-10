import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/PageHeader'
import { ProjectCard } from '@/features/projects/components/ProjectCard'
import { useProjects } from '@/features/projects/useProjects'
import { formatUsd } from '@/lib/formatters'
import { cn } from '@/lib/cn'
import type { ProjectType } from '@/types/projects'

const FILTERS: { label: string; type?: ProjectType }[] = [
  { label: 'All' },
  { label: 'Land', type: 'land_acquisition' },
  { label: 'Schools', type: 'education' },
  { label: 'Sports', type: 'sports' },
  { label: 'Agriculture', type: 'agriculture' },
  { label: 'Community', type: 'community_cause' },
  { label: 'Cargo', type: 'cargo_import' },
  { label: 'Investment', type: 'investment' },
]

const PAGE_SIZE = 12

export function ProjectBrowsePage() {
  const navigate = useNavigate()
  const [filterType, setFilterType] = useState<ProjectType | undefined>()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const { projects, isLoading, error } = useProjects(
    filterType ? { type: filterType, visibility: 'public' } : { visibility: 'public' },
  )

  const publicActive = useMemo(
    () => projects.filter((p) => p.visibility === 'public' && p.status !== 'draft'),
    [projects],
  )

  const visible = publicActive.slice(0, visibleCount)

  const stats = useMemo(() => {
    const active = publicActive.filter((p) =>
      ['active', 'funded', 'in_progress'].includes(p.status),
    ).length
    const raised = publicActive.reduce(
      (sum, p) => sum + Number(p.funding_raised_usd ?? 0),
      0,
    )
    const countries = new Set(
      publicActive.map((p) => p.country).filter((c): c is string => Boolean(c)),
    )
    return { active, raised, countries: countries.size || 1 }
  }, [publicActive])

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <p className="text-[13px] font-medium text-muted">SashaCrush</p>
        <h1 className="max-w-2xl text-[28px] font-semibold tracking-tight text-ink sm:text-[36px]">
          Invest in Uganda&apos;s future
        </h1>
        <p className="max-w-xl text-[13px] leading-relaxed text-muted">
          Land. Schools. Sports. Agriculture. Community projects with full
          financial transparency — receipts, site photos, and progress updates.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            onClick={() =>
              document.getElementById('project-grid')?.scrollIntoView({
                behavior: 'smooth',
              })
            }
          >
            Browse projects
          </Button>
          <Link to="/login">
            <Button variant="secondary">Sign in to contribute</Button>
          </Link>
        </div>
      </header>

      <div className="ui-segment flex-wrap">
        {FILTERS.map((filter) => {
          const active = filterType === filter.type
          return (
            <button
              key={filter.label}
              type="button"
              onClick={() => {
                setFilterType(filter.type)
                setVisibleCount(PAGE_SIZE)
              }}
              className={cn(
                'ui-segment-item',
                active ? 'ui-segment-item-active' : 'ui-segment-item-idle',
              )}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      <section className="ui-panel p-5 sm:p-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { value: String(stats.active), label: 'Projects active' },
            { value: formatUsd(stats.raised), label: 'Total raised' },
            { value: String(stats.countries), label: 'Countries represented' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-[13px] text-muted">{stat.label}</p>
              <p className="mt-2 text-[28px] font-semibold tracking-tight text-ink tabular-nums">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div id="project-grid" className="space-y-4">
        {error ? (
          <p className="ui-alert-danger" role="alert">
            {error}
          </p>
        ) : null}
        {isLoading ? (
          <p className="text-[13px] text-muted">Loading projects…</p>
        ) : visible.length === 0 ? (
          <EmptyState
            title="No projects found"
            description="Try another filter, or check back soon."
            action={
              <Button variant="secondary" onClick={() => setFilterType(undefined)}>
                Clear filter
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {visible.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => navigate(`/projects/${project.slug}`)}
                />
              ))}
            </div>
            {visibleCount < publicActive.length ? (
              <div className="flex justify-center pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                >
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
