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
    <div className="space-y-10">
      {/* Full-bleed hero — one composition: brand, headline, line, CTAs */}
      <section
        className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden"
        aria-label="SashaCrush"
      >
        <div
          className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_10%,#1a8a4a_0%,#0b4626_42%,#0a0a0a_100%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          aria-hidden
          style={{
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><path d='M0 40h80M40 0v80' stroke='%23ffffff' stroke-width='0.6' fill='none'/><path d='M0 20q20 8 40 0t40 0M0 60q20 8 40 0t40 0' stroke='%23ffffff' stroke-width='0.45' fill='none'/></svg>`,
            )}")`,
          }}
        />
        <div className="relative mx-auto flex min-h-[min(72vh,560px)] max-w-5xl flex-col justify-end px-5 pb-12 pt-16 sm:px-8 sm:pb-16">
          <p className="sc-hero-reveal text-[13px] font-semibold tracking-[0.14em] text-white/75 uppercase">
            SashaCrush
          </p>
          <h1 className="sc-hero-reveal sc-hero-reveal-delay-1 mt-3 max-w-xl text-[34px] font-semibold tracking-tight text-white sm:text-[44px]">
            Invest in Uganda&apos;s future
          </h1>
          <p className="sc-hero-reveal sc-hero-reveal-delay-2 mt-3 max-w-md text-[14px] leading-relaxed text-white/75">
            Fund land, schools, and community work with receipts, site photos, and
            progress you can verify.
          </p>
          <div className="sc-hero-reveal sc-hero-reveal-delay-3 mt-7 flex flex-wrap gap-2">
            <Button
              className="bg-white text-ink hover:bg-white/90"
              onClick={() =>
                document.getElementById('project-grid')?.scrollIntoView({
                  behavior: 'smooth',
                })
              }
            >
              Browse projects
            </Button>
            <Link to="/about">
              <Button
                variant="secondary"
                className="border-white/25 bg-transparent text-white hover:bg-white/10"
              >
                How it works
              </Button>
            </Link>
          </div>
        </div>
      </section>

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

      <section className="grid gap-6 sm:grid-cols-3" aria-label="Portfolio snapshot">
        {[
          { value: isLoading ? '—' : String(stats.active), label: 'Projects active' },
          {
            value: isLoading ? '—' : formatUsd(stats.raised),
            label: 'Total raised',
          },
          {
            value: isLoading ? '—' : String(stats.countries),
            label: 'Countries represented',
          },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="text-[13px] text-muted">{stat.label}</p>
            <p className="mt-1.5 text-[26px] font-semibold tracking-tight text-ink tabular-nums">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <div id="project-grid" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-ink">
              Open projects
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Transparent funding — every contribution leaves a trail.
            </p>
          </div>
          {!isLoading && publicActive.length > 0 ? (
            <p className="text-[12px] text-muted tabular-nums">
              {publicActive.length} listed
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="ui-alert-danger" role="alert">
            {error}
          </p>
        ) : null}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-busy>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ui-skeleton h-56 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title="Projects are being prepared"
            description="Public listings will appear here once an admin publishes them. You can still sign in to manage deals, or learn how funding works."
            action={
              <div className="flex flex-wrap gap-2">
                <Link to="/about">
                  <Button variant="secondary">How funding works</Button>
                </Link>
                <Link to="/login">
                  <Button>Staff / seller sign in</Button>
                </Link>
                {filterType ? (
                  <Button variant="secondary" onClick={() => setFilterType(undefined)}>
                    Clear filter
                  </Button>
                ) : null}
              </div>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {visible.map((project, index) => (
                <div
                  key={project.id}
                  className="sc-card-reveal"
                  style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
                >
                  <ProjectCard
                    project={project}
                    onClick={() => navigate(`/projects/${project.slug}`)}
                  />
                </div>
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
