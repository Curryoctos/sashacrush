import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function AboutPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-[13px] font-medium text-muted">How it works</p>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">
          Transparent community funding
        </h1>
        <p className="max-w-2xl text-[13px] leading-relaxed text-muted">
          SashaCrush helps people worldwide discover, fund, and track projects in
          Uganda — land, schools, sports, agriculture, cargo, and more — with
          receipts, site photos, and progress updates on every contribution.
        </p>
      </header>

      <ol className="ui-panel divide-y divide-border overflow-hidden">
        {[
          {
            title: 'Browse projects',
            body: 'Explore public projects by type and location. Every listing shows funding progress and status.',
          },
          {
            title: 'Contribute securely',
            body: 'Support with card, mobile money, wire, or crypto. You receive a receipt for every confirmed payment.',
          },
          {
            title: 'Follow the work',
            body: 'Milestones, site photos, documents, and updates keep you informed until the project completes.',
          },
        ].map((step, index) => (
          <li key={step.title} className="flex gap-4 px-4 py-4 sm:px-5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface text-[12px] font-semibold text-ink">
              {index + 1}
            </span>
            <div>
              <p className="text-[15px] font-medium text-ink">{step.title}</p>
              <p className="mt-1 text-[13px] text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <Link to="/projects">
        <Button>Browse projects</Button>
      </Link>
    </div>
  )
}
