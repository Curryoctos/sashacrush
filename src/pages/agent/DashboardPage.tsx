import { PortalShell } from '@/components/layout/PortalShell'

const agentNav = [
  { label: 'Dashboard', to: '/agent' },
  { label: 'Maps', to: '/agent/maps' },
  { label: 'Camera', to: '/agent/camera' },
]

export function AgentDashboardPage() {
  return (
    <PortalShell portal="Agent Portal" navItems={agentNav}>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Agent Dashboard</h2>
        <p className="mt-2 text-sm text-muted">
          On-ground tools: maps, GPS-tagged photos, receipts, and project suggestions.
        </p>
      </div>
    </PortalShell>
  )
}
