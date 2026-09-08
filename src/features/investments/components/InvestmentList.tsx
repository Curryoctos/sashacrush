import { Badge, statusTone } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/PageHeader'
import { investmentMethodLabel } from '@/features/investments/validation'
import { formatDate, formatUsd } from '@/lib/formatters'
import type { Investment } from '@/types/database'

interface InvestmentListProps {
  investments: Investment[]
  title?: string
  description?: string
  emptyTitle?: string
  showExecutive?: boolean
  executiveLabel?: (investment: Investment) => string | null
}

export function InvestmentList({
  investments,
  title = 'Investment history',
  description,
  emptyTitle = 'No investments yet.',
  showExecutive = false,
  executiveLabel,
}: InvestmentListProps) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div className="overflow-x-auto px-1 pb-2">
        {investments.length === 0 ? (
          <div className="px-4 pb-4">
            <EmptyState title={emptyTitle} />
          </div>
        ) : (
          <table className="ui-table">
            <thead>
              <tr>
                <th>Date</th>
                {showExecutive && <th>Executive</th>}
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((investment) => (
                <tr key={investment.id}>
                  <td className="whitespace-nowrap">{formatDate(investment.created_at)}</td>
                  {showExecutive && (
                    <td>{executiveLabel?.(investment) ?? '—'}</td>
                  )}
                  <td className="font-medium">{formatUsd(Number(investment.amount_usd))}</td>
                  <td>{investmentMethodLabel(investment.method)}</td>
                  <td className="max-w-[12rem] truncate font-mono text-xs">
                    {investment.reference}
                  </td>
                  <td>
                    <Badge tone={statusTone(investment.status)}>{investment.status}</Badge>
                    {investment.status === 'rejected' && investment.rejection_reason ? (
                      <p className="mt-1 text-xs text-muted">{investment.rejection_reason}</p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  )
}
