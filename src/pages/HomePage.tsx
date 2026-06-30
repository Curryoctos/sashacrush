import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ROLE_LABELS } from '@/types'

const portals = [
  { role: 'admin', path: '/admin', description: 'Payments, wallet, land records, executive channel' },
  { role: 'executive', path: '/executive', description: 'Analytics, documents, executive communications' },
  { role: 'agent', path: '/agent', description: 'Maps, camera, receipts, project suggestions' },
  { role: 'seller', path: '/seller', description: 'Land details, chat, receipts, photo upload' },
] as const

export function HomePage() {
  return (
    <AppShell
      title="SashaCrush"
      description="Cross-border land transactions, payments, and collaboration — built under CurryOctos."
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {portals.map((portal) => (
          <Link
            key={portal.path}
            to={portal.path}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-500 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-ink">
              {ROLE_LABELS[portal.role]}
            </h2>
            <p className="mt-2 text-sm text-muted">{portal.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-6">
        <h2 className="text-base font-semibold text-ink">Community</h2>
        <p className="mt-2 text-sm text-muted">
          Public community board for incubation visitors and collaborators.
        </p>
        <Link
          to="/community"
          className="mt-4 inline-flex text-sm font-medium text-brand-700 hover:text-brand-900"
        >
          Visit community →
        </Link>
      </div>
    </AppShell>
  )
}
