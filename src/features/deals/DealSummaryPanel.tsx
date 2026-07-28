import { Link } from 'react-router-dom'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, Stat, StatGrid } from '@/components/ui/Card'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
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
    <div className="ui-page max-w-4xl">
      <div>
        <PageBackLink to={backLink.to} label={backLink.label} />
        <PageHeader
          className="mt-3 border-none pb-0"
          eyebrow="Deal room"
          title={deal.land.title}
          description={deal.land.location ?? 'Land transaction overview'}
        />
      </div>

      <Card>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Seller" value={deal.land.seller_name ?? 'Unassigned'} />
          <Metric label="Total value" value={formatUsd(deal.land.total_value_usd)} />
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Status</dt>
            <dd className="mt-1">
              <Badge tone={statusTone(deal.land.status)}>{deal.land.status}</Badge>
            </dd>
          </div>
          <Metric label="Paid" value={formatUsd(balance.paidUsd)} />
          <Metric label="Outstanding" value={formatUsd(balance.outstandingUsd)} />
          <Metric label="Pending payments" value={formatUsd(balance.pendingUsd)} />
        </dl>
      </Card>

      <StatGrid>
        <Stat label="Unread messages" value={String(deal.unreadCount)} />
        <Stat label="Docs awaiting sign" value={String(pendingDocs)} />
        <Stat label="Signed documents" value={String(signedDocs)} />
        <Stat
          label="Payments"
          value={`${confirmedPayments} confirmed / ${pendingPayments} pending`}
        />
      </StatGrid>

      {quickActions && quickActions.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-ink">Quick actions</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Link key={action.to} to={action.to}>
                <Button variant={action.primary ? 'primary' : 'secondary'}>{action.label}</Button>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  )
}
