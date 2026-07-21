import { Link } from 'react-router-dom'
import { computeDealBalance } from '@/features/payments/balance'
import { formatUsd } from '@/lib/land-records'
import type { DealSummary } from '@/features/deals/useDealSummary'

interface DealSummaryPanelProps {
  deal: DealSummary
  backLink: { to: string; label: string }
  quickActions?: Array<{ label: string; to: string; primary?: boolean }>
}

export function DealSummaryPanel({ deal, backLink, quickActions }: DealSummaryPanelProps) {
  const pendingDocs = deal.documents.filter((doc) => doc.status === 'sent').length
  const signedDocs = deal.documents.filter((doc) => doc.status === 'signed').length
  const confirmedPayments = deal.payments.filter((payment) => payment.status === 'confirmed').length
  const pendingPayments = deal.payments.filter((payment) => payment.status !== 'confirmed').length
  const balance = computeDealBalance(deal.land.total_value_usd, deal.payments)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link to={backLink.to} className="text-sm text-brand-700 hover:underline">
          ← {backLink.label}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Deal Overview</h1>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">{deal.land.title}</h2>
        <p className="mt-1 text-sm text-muted">{deal.land.location}</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-muted">Seller</dt>
            <dd className="mt-1 text-sm text-ink">{deal.land.seller_name ?? 'Unassigned'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted">Total value</dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {formatUsd(deal.land.total_value_usd)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-muted">Status</dt>
            <dd className="mt-1 text-sm capitalize text-ink">{deal.land.status}</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Unread messages" value={String(deal.unreadCount)} />
        <StatCard label="Docs awaiting sign" value={String(pendingDocs)} />
        <StatCard label="Signed documents" value={String(signedDocs)} />
        <StatCard
          label="Payments"
          value={`${confirmedPayments} confirmed / ${pendingPayments} pending`}
        />
      </div>

      {quickActions && quickActions.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-ink">Quick actions</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className={
                  action.primary
                    ? 'rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700'
                    : 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50'
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-ink">{value}</p>
    </div>
  )
}
