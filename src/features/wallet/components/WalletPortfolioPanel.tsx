import { Badge } from '@/components/ui/Badge'
import { Card, Stat, StatGrid } from '@/components/ui/Card'
import {
  formatRateTimestamp,
  usdValueForHolding,
  type WalletDisplayRates,
} from '@/features/wallet/displayRates'
import type { WalletHolding } from '@/features/wallet/constants'
import { formatUgx, formatUsd } from '@/lib/formatters'

interface WalletPortfolioPanelProps {
  holdings: WalletHolding[]
  rates: WalletDisplayRates | undefined
  ratesLoading: boolean
  balancesLoading: boolean
}

export function WalletPortfolioPanel({
  holdings,
  rates,
  ratesLoading,
  balancesLoading,
}: WalletPortfolioPanelProps) {
  const cryptoUsd = rates?.cryptoUsd
  const usdToUgx = rates?.usdToUgx ?? 0

  const rows = holdings.map((holding) => {
    const usd =
      cryptoUsd != null ? usdValueForHolding(holding.asset, holding.balance, cryptoUsd) : 0
    const ugx = usd * usdToUgx
    return { holding, usd, ugx }
  })

  const totalUsd = rows.reduce((sum, row) => sum + row.usd, 0)
  const totalUgx = totalUsd * usdToUgx
  const canValue = Boolean(cryptoUsd && usdToUgx > 0 && !rates?.stale)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="ui-section-title">Portfolio</h2>
          <p className="ui-section-desc">
            BTC (WBTC), ETH, and USDT from the connected wallet with live USD / UGX display rates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rates?.stale ? (
            <Badge tone="warning">Rates stale</Badge>
          ) : rates && !ratesLoading ? (
            <Badge tone="success">Live rates</Badge>
          ) : null}
          {rates?.fetchedAt ? (
            <span className="text-xs text-muted">
              As of {formatRateTimestamp(rates.fetchedAt)}
            </span>
          ) : null}
        </div>
      </div>

      {rates?.stale && rates.error ? (
        <p className="ui-alert-danger" role="alert">
          Live rate unavailable ({rates.error}). Totals may be outdated — refresh or try again
          before Convert and Pay.
        </p>
      ) : null}

      {balancesLoading || ratesLoading ? (
        <p className="text-sm text-muted">Loading portfolio…</p>
      ) : (
        <>
          <StatGrid className="lg:grid-cols-2">
            <Stat
              label="Total portfolio (USD)"
              value={canValue || totalUsd > 0 ? formatUsd(totalUsd) : '—'}
              emphasize
              hint={canValue ? 'Sum of wallet holdings at display rates' : 'Waiting for live rates'}
            />
            <Stat
              label="Total portfolio (UGX)"
              value={canValue || totalUgx > 0 ? formatUgx(totalUgx) : '—'}
              emphasize
              hint={
                usdToUgx > 0
                  ? `1 USD ≈ ${usdToUgx.toLocaleString(undefined, { maximumFractionDigits: 0 })} UGX`
                  : undefined
              }
            />
          </StatGrid>

          <div className="grid gap-3 sm:grid-cols-3">
            {rows.map(({ holding, usd, ugx }) => (
              <Card key={holding.asset} padding="sm">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  {holding.asset}
                  {holding.sourceLabel ? ` · ${holding.sourceLabel}` : ''}
                </p>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {Number.isFinite(holding.balance)
                    ? holding.balance.toLocaleString(undefined, { maximumFractionDigits: 8 })
                    : holding.balanceFormatted}
                </p>
                <p className="mt-2 text-sm text-ink">
                  {canValue || usd > 0 ? formatUsd(usd) : '—'}
                </p>
                <p className="text-xs text-muted">
                  {canValue || ugx > 0 ? formatUgx(ugx) : '—'}
                  {cryptoUsd?.[holding.asset]
                    ? ` · ${formatUsd(cryptoUsd[holding.asset])}/${holding.asset}`
                    : ''}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
