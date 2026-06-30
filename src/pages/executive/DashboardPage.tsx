import { PortalShell } from '@/components/layout/PortalShell'

const executiveNav = [
  { label: 'Dashboard', to: '/executive' },
  { label: 'Communications', to: '/executive/communications' },
]

export function ExecutiveDashboardPage() {
  return (
    <PortalShell portal="Executive Portal" navItems={executiveNav}>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Executive Dashboard</h2>
        <p className="mt-2 text-sm text-muted">
          Project dashboards, analytics, and executive communications — isolated from the
          seller portal.
        </p>
      </div>
    </PortalShell>
  )
}
