import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { useWallet } from '@/features/wallet/WalletProvider'
import {
  ETHEREUM_MAINNET_CHAIN_ID,
  type CryptoAsset,
} from '@/features/wallet/constants'
import { fetchWalletDisplayRates } from '@/features/wallet/displayRates'
import { getTreasuryAddress } from '@/features/wallet/sendTransfer'
import { settleCryptoConversion } from '@/features/wallet/settleCryptoConversion'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { formatUgx, formatUsd } from '@/lib/formatters'
import { notifyInfo, notifySuccess } from '@/features/notifications/useNotifications'
import { shortenAddress } from '@/features/wallet/constants'

const LOCK_SECONDS = 60
const ASSETS: CryptoAsset[] = ['BTC', 'ETH', 'USDT']

interface LandOption {
  id: string
  title: string
  total_value_usd: number
}

/**
 * C-09 crypto leg: fresh rate → wallet transfer to treasury → payment + receipt.
 */
export function AdminWalletConvertPage() {
  const { user } = useAuth()
  const wallet = useWallet()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const treasuryAddress = getTreasuryAddress()

  const [landId, setLandId] = useState('')
  const [asset, setAsset] = useState<CryptoAsset>('ETH')
  const [ugxAmount, setUgxAmount] = useState('')
  const [locked, setLocked] = useState<{
    cryptoUsd: number
    usdToUgx: number
    cryptoNeeded: number
    usdNeeded: number
    expiresAt: number
  } | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const landsQuery = useQuery({
    queryKey: ['land-records', 'crypto-convert'],
    queryFn: async (): Promise<LandOption[]> => {
      const { data, error: queryError } = await supabase
        .from('land_records')
        .select('id, title, total_value_usd')
        .neq('status', 'archived')
        .order('title', { ascending: true })
      if (queryError) {
        throw queryError
      }
      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        total_value_usd: Number(row.total_value_usd),
      }))
    },
  })

  const holding = wallet.holdings.find((row) => row.asset === asset)

  useEffect(() => {
    if (!locked) {
      setSecondsLeft(0)
      return
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((locked.expiresAt - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) {
        setLocked(null)
        notifyInfo('Rate window expired. Fetch a fresh rate to continue.')
      }
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [locked])

  const preview = useMemo(() => {
    if (!locked) {
      return null
    }
    return {
      cryptoNeeded: locked.cryptoNeeded,
      usdNeeded: locked.usdNeeded,
    }
  }, [locked])

  if (!wallet.address) {
    return <Navigate to="/admin/wallet" replace />
  }

  const onWrongChain =
    wallet.chainId != null && wallet.chainId !== ETHEREUM_MAINNET_CHAIN_ID

  const lockRate = async () => {
    setError(null)
    if (!landId) {
      setError('Select the land deal this payment is for.')
      return
    }
    const ugx = Number(ugxAmount)
    if (!Number.isFinite(ugx) || ugx <= 0) {
      setError('Enter a positive UGX amount to pay.')
      return
    }
    setBusy(true)
    try {
      const rates = await fetchWalletDisplayRates({ force: true })
      if (rates.stale || rates.usdToUgx <= 0 || rates.cryptoUsd[asset] <= 0) {
        throw new Error(rates.error || 'Live rate unavailable — cannot initiate crypto payment.')
      }
      const usdNeeded = ugx / rates.usdToUgx
      const cryptoNeeded = usdNeeded / rates.cryptoUsd[asset]
      if ((holding?.balance ?? 0) + 1e-12 < cryptoNeeded) {
        throw new Error(
          `Insufficient ${asset} in wallet (need ~${cryptoNeeded.toFixed(8)}, have ${holding?.balance ?? 0}).`,
        )
      }
      setLocked({
        cryptoUsd: rates.cryptoUsd[asset],
        usdToUgx: rates.usdToUgx,
        cryptoNeeded,
        usdNeeded,
        expiresAt: Date.now() + LOCK_SECONDS * 1000,
      })
    } catch (err) {
      setLocked(null)
      setError(err instanceof Error ? err.message : 'Could not lock rate.')
    } finally {
      setBusy(false)
    }
  }

  const confirmConversion = async () => {
    setError(null)
    if (!locked || secondsLeft === 0) {
      setError('Rate window expired. Fetch a fresh rate.')
      return
    }
    if (!treasuryAddress) {
      setError(
        'Set VITE_CRYPTO_TREASURY_ADDRESS in .env.local to the company receive wallet, then restart the app.',
      )
      return
    }
    if (!user?.id) {
      setError('You must be signed in.')
      return
    }
    const provider = wallet.getBrowserProvider()
    if (!provider) {
      setError('Wallet provider unavailable. Reconnect and try again.')
      return
    }

    setBusy(true)
    try {
      const result = await settleCryptoConversion({
        provider,
        userId: user.id,
        landId,
        asset,
        cryptoAmount: locked.cryptoNeeded,
        amountUsd: locked.usdNeeded,
        amountUgx: Number(ugxAmount),
        cryptoUsdRate: locked.cryptoUsd,
        usdToUgxRate: locked.usdToUgx,
        treasuryAddress,
        chainId: ETHEREUM_MAINNET_CHAIN_ID,
      })

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payments'] }),
        wallet.refreshBalances(),
      ])

      notifySuccess(
        `Payment confirmed. Receipt ${result.receiptNumber}. Tx ${shortenAddress(result.txHash)}.`,
      )
      navigate(`/admin/payments?land=${landId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete conversion.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ui-page max-w-4xl space-y-6">
      <div>
        <PageBackLink to="/admin/wallet" label="Owner wallet" />
        <PageHeader
          className="mt-3"
          eyebrow="Conversion kit"
          title="Convert and Pay"
          description={
            user?.email
              ? `Signed in as ${user.email}. Fresh rate → approve in wallet → payment + seller receipt.`
              : 'Fresh rate → approve in wallet → payment + seller receipt.'
          }
        />
      </div>

      {!treasuryAddress ? (
        <p className="ui-alert-danger" role="alert">
          Missing <code className="text-xs">VITE_CRYPTO_TREASURY_ADDRESS</code> — company wallet that
          receives the on-chain transfer. Add it to `.env.local` and restart.
        </p>
      ) : (
        <p className="text-sm text-muted">
          Treasury: <span className="font-mono">{shortenAddress(treasuryAddress)}</span>
        </p>
      )}

      {onWrongChain ? (
        <p className="ui-alert-danger" role="alert">
          Switch the connected wallet to Ethereum mainnet before converting.
        </p>
      ) : null}

      {error ? (
        <p className="ui-alert-danger" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader
          title="Payment amount"
          description="Choose the deal, asset, and UGX to settle. Rate is fetched fresh and locked for 60 seconds."
        />
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="ui-label">Land deal</span>
            <select
              className="ui-input"
              value={landId}
              disabled={busy || Boolean(locked) || landsQuery.isLoading}
              onChange={(event) => setLandId(event.target.value)}
              required
            >
              <option value="">
                {landsQuery.isLoading ? 'Loading deals…' : 'Select a deal…'}
              </option>
              {(landsQuery.data ?? []).map((land) => (
                <option key={land.id} value={land.id}>
                  {land.title} · {formatUsd(land.total_value_usd)}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="ui-label">Asset</span>
            <select
              className="ui-input"
              value={asset}
              disabled={busy || Boolean(locked)}
              onChange={(event) => setAsset(event.target.value as CryptoAsset)}
            >
              {ASSETS.map((value) => (
                <option key={value} value={value}>
                  {value}
                  {value === 'BTC' ? ' (WBTC)' : ''}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">
              Wallet balance:{' '}
              {holding
                ? holding.balance.toLocaleString(undefined, { maximumFractionDigits: 8 })
                : '—'}{' '}
              {asset}
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="ui-label">Amount to pay (UGX)</span>
            <input
              className="ui-input max-w-xs"
              type="number"
              min="1"
              step="1"
              value={ugxAmount}
              disabled={busy || Boolean(locked)}
              onChange={(event) => setUgxAmount(event.target.value)}
              placeholder="0"
              required
            />
          </label>

          {!locked ? (
            <Button
              type="button"
              disabled={busy || onWrongChain || !treasuryAddress}
              onClick={() => void lockRate()}
            >
              {busy ? 'Fetching live rate…' : 'Fetch fresh rate (60s window)'}
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border border-border bg-surface px-4 py-3">
              <p className="text-sm text-ink">
                Locked: {formatUsd(locked.cryptoUsd)} / {asset} · 1 USD ={' '}
                {locked.usdToUgx.toLocaleString(undefined, { maximumFractionDigits: 0 })} UGX
              </p>
              {preview ? (
                <p className="text-sm font-medium text-ink">
                  You will send ~{preview.cryptoNeeded.toFixed(8)} {asset} (
                  {formatUsd(preview.usdNeeded)}) to treasury to cover{' '}
                  {formatUgx(Number(ugxAmount))}.
                </p>
              ) : null}
              <p className="text-sm text-muted">Confirm in wallet within {secondsLeft}s</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={secondsLeft === 0 || busy || !treasuryAddress}
                  onClick={() => void confirmConversion()}
                >
                  {busy ? 'Waiting for wallet…' : 'Confirm in wallet'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setLocked(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <p className="text-sm text-muted">
        <Link className="underline" to="/admin/wallet">
          Back to portfolio
        </Link>
      </p>
    </div>
  )
}
