import { PortalShell } from '@/components/layout/PortalShell'

const adminNav = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Land Records', to: '/admin/land' },
  { label: 'Payments', to: '/admin/payments' },
]

export function AdminDashboardPage() {
  return (
    <PortalShell portal="Admin / Owner Portal" navItems={adminNav}>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Admin Dashboard</h2>
        <p className="mt-2 text-sm text-muted">
          Month 1 scope: land record management, payment initiation, balance tracker, and
          executive channel access.
        </p>
      </div>
    </PortalShell>
  )
}
