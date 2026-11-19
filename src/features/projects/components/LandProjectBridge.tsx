import { Link } from 'react-router-dom'
import { ArrowRight, Landmark, FolderKanban } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  landWorkspacePath,
  projectPurchasesPath,
} from '@/features/projects/projectLandLink'

interface LinkedLandCardProps {
  landId: string
  landTitle?: string | null
  roleBase?: '/admin' | '/agent' | '/executive'
}

/** Shown on a funding project when it is tied to a land deal. */
export function LinkedLandCard({
  landId,
  landTitle,
  roleBase = '/admin',
}: LinkedLandCardProps) {
  const workspace = landWorkspacePath(roleBase, landId)
  return (
    <aside className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-elevated text-ink">
          <Landmark className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Linked land deal
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-ink">
            {landTitle?.trim() || 'Land workspace'}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Documents, seller chat, and field photos stay on the land record.
            Purchases run through this project.
          </p>
        </div>
      </div>
      <Link to={workspace}>
        <Button variant="secondary" size="sm">
          Open land workspace
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </Link>
    </aside>
  )
}

interface LinkedProjectCardProps {
  projectId: string
  projectTitle: string
  projectSlug: string
  showPurchases?: boolean
}

/** Shown on a land deal when a funding project is linked. */
export function LinkedProjectCard({
  projectId,
  projectTitle,
  projectSlug,
  showPurchases = true,
}: LinkedProjectCardProps) {
  return (
    <aside className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-elevated text-ink">
          <FolderKanban className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Linked funding project
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-ink">
            {projectTitle}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Purchases and disbursements for this deal are recorded on the project.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to={`/admin/funding/${encodeURIComponent(projectSlug)}`}>
          <Button variant="secondary" size="sm">
            Open project
          </Button>
        </Link>
        {showPurchases ? (
          <Link to={projectPurchasesPath(projectId, 'collect')}>
            <Button size="sm">
              Purchases
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </Link>
        ) : null}
      </div>
    </aside>
  )
}
