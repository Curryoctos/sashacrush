import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, Stat } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { downloadCsv } from '@/features/analytics/exportAnalyticsCsv'
import { useAnalyticsDashboard } from '@/features/analytics/useAnalyticsDashboard'
import { formatPct, formatUsd } from '@/lib/formatters'
import { formatSupabaseError } from '@/lib/supabase-errors'

const CHART_GREEN = '#12512e'
const CHART_MUTED = '#6b7280'
const CHART_INK = '#1c1917'
const DOC_COLORS = ['#9ca3af', '#a16207', CHART_GREEN, '#57534e']

export type AnalyticsPortal = 'admin' | 'executive' | 'agent'

interface AnalyticsDashboardViewProps {
  portal: AnalyticsPortal
  userEmail?: string | null
}

export function AnalyticsDashboardView({ portal, userEmail }: AnalyticsDashboardViewProps) {
  const query = useAnalyticsDashboard()
  const data = query.data

  const exportCsv = () => {
    if (!data) {
      return
    }
    downloadCsv(
      `sashacrush-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Deal',
        'Status',
        'Total USD',
        'Paid USD',
        'Pending USD',
        'Outstanding USD',
        'Pct Paid',
        'Photos',
        'Last Payment',
        'Delayed',
      ],
      data.deals.map((deal) => [
        deal.title,
        deal.status,
        deal.totalValueUsd.toFixed(2),
        deal.paidUsd.toFixed(2),
        deal.pendingUsd.toFixed(2),
        deal.outstandingUsd.toFixed(2),
        deal.pctPaid.toFixed(2),
        deal.photoCount,
        deal.lastPaymentAt ?? '',
        deal.delayed ? 'yes' : 'no',
      ]),
    )
  }

  return (
    <div className="ui-page max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Analytics"
          title="Portfolio charts"
          description={
            userEmail
              ? `Signed in as ${userEmail}. Payment progress, delays, photos, and documents.`
              : 'Payment progress, delays, photos, and documents.'
          }
        />
        <Button type="button" variant="secondary" disabled={!data} onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      {query.isLoading ? <p className="text-sm text-muted">Loading analytics…</p> : null}
      {query.error ? (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(query.error as Error)}
        </p>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Active deals" value={String(data.totals.dealCount)} />
            <Stat label="Confirmed paid" value={formatUsd(data.totals.paidUsd)} />
            <Stat label="Outstanding" value={formatUsd(data.totals.outstandingUsd)} />
            <Stat
              label="Delayed (30+ days)"
              value={String(data.totals.delayedCount)}
            />
          </div>

          {data.delayedDeals.length > 0 ? (
            <Card>
              <CardHeader
                title="Delay indicators"
                description="Deals with outstanding balance and no payment activity for 30+ days."
              />
              <ul className="space-y-2 text-sm">
                {data.delayedDeals.map((deal) => (
                  <li key={deal.landId} className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium text-ink">{deal.title}</span>
                    <span className="text-amber-800">
                      {formatUsd(deal.outstandingUsd)} outstanding · {formatPct(deal.pctPaid)} paid
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Payment progress"
                description="Paid vs outstanding as a share of each deal’s total value."
              />
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.deals.map((deal) => ({
                      name: truncate(deal.title, 18),
                      paid: Math.round(deal.pctPaid * 100) / 100,
                      outstanding: Math.max(0, Math.round((100 - deal.pctPaid) * 100) / 100),
                    }))}
                    layout="vertical"
                    margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => `${Number(value).toFixed(1)}%`}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="paid" stackId="progress" fill={CHART_GREEN} name="Paid" />
                    <Bar
                      dataKey="outstanding"
                      stackId="progress"
                      fill="#d6d3d1"
                      name="Outstanding"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Monthly payments"
                description="Confirmed payout volume over the last 12 months."
              />
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.paymentsMonthly}
                    margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => formatUsd(Number(value))}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="paid_usd" fill={CHART_GREEN} name="Paid USD" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Photo upload frequency"
                description="Field photos captured per month."
              />
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.photosMonthly}
                    margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="photo_count"
                      fill={CHART_INK}
                      name="Photos"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Document status"
                description="Deal documents by workflow stage."
              />
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.documents}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(props) => {
                        const status = String(props.name ?? '')
                        const count = Number(props.value ?? 0)
                        return `${status} (${count})`
                      }}
                    >
                      {data.documents.map((entry, index) => (
                        <Cell
                          key={entry.status}
                          fill={DOC_COLORS[index % DOC_COLORS.length] ?? CHART_MUTED}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Deal table"
              description={`Visible to ${portal} staff. CSV export includes delay flags.`}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 font-medium">Deal</th>
                    <th className="py-2 pr-3 font-medium">Paid</th>
                    <th className="py-2 pr-3 font-medium">Outstanding</th>
                    <th className="py-2 pr-3 font-medium">Progress</th>
                    <th className="py-2 font-medium">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {data.deals.map((deal) => (
                    <tr key={deal.landId} className="border-b border-border/70">
                      <td className="py-2.5 pr-3 font-medium text-ink">{deal.title}</td>
                      <td className="py-2.5 pr-3">{formatUsd(deal.paidUsd)}</td>
                      <td className="py-2.5 pr-3">{formatUsd(deal.outstandingUsd)}</td>
                      <td className="py-2.5 pr-3">{formatPct(deal.pctPaid)}</td>
                      <td className="py-2.5">
                        {deal.delayed ? (
                          <span className="text-amber-800">Delayed</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.deals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-muted">
                        No active deals yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value
  }
  return `${value.slice(0, max - 1)}…`
}
