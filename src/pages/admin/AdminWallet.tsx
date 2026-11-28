import { Link } from 'react-router-dom'
import { RefreshCw, Unplug, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { WalletPortfolioPanel } from '@/features/wallet/components/WalletPortfolioPanel'
import { useWallet } from '@/features/wallet/WalletProvider'
import {
  ETHEREUM_MAINNET_CHAIN_ID,
  shortenAddress,
} from '@/features/wallet/constants'
import { getTreasuryAddress } from '@/features/wallet/sendTransfer'
import { useWalletDisplayRates } from '@/features/wallet/useWalletDisplayRates'
import {
  notifyInfo,
  notifySuccess,
} from '@/features/notifications/useNotifications'

export function AdminWalletPage() {
  const wallet = useWallet()
  const ratesQuery = useWalletDisplayRates(Boolean(wallet.address))

  const onWrongChain =
    wallet.address != null &&
    wallet.chainId != null &&
    wallet.chainId !== ETHEREUM_MAINNET_CHAIN_ID

  const handleMetaMask = async () => {
    try {
      await wallet.connectMetaMask()
      notifySuccess(
        'MetaMask connected. Balances are read-only — keys stay on your device.',
      )
    } catch (err) {
      notifyInfo(
        err instanceof Error ? err.message : 'Could not connect MetaMask.',
      )
    }
  }

  const handleWalletConnect = async () => {
    try {
      await wallet.connectWalletConnect()
      notifySuccess(
        'Wallet connected via WalletConnect. Keys stay on your device.',
      )
    } catch (err) {
      notifyInfo(
        err instanceof Error ? err.message : 'Could not connect WalletConnect.',
      )
    }
  }

  const handleDisconnect = async () => {
    await wallet.disconnect()
    notifyInfo('Wallet disconnected. Session cleared.')
  }

  const handleRefresh = async () => {
    await Promise.all([wallet.refreshBalances(), ratesQuery.refetch()])
  }

  const ratesReady = Boolean(ratesQuery.data && !ratesQuery.data.stale)
  const treasuryAddress = getTreasuryAddress()
  const treasuryConfigured = Boolean(treasuryAddress)
  const canConvertAndPay = Boolean(
    wallet.address && ratesReady && !onWrongChain && treasuryConfigured,
  )

  return (
    <div className="ui-page">
      <PageHeader
        backTo="/admin/finance"
        backLabel="Finance"
        eyebrow="Optional"
        title="Crypto pay"
        description="Connect MetaMask or WalletConnect to convert crypto into a deal payment. Keys stay on your device — never on the server."
      />

      {!treasuryConfigured ? (
        <p className="ui-alert-warning" role="status">
          Crypto pay is not configured for this deploy. Set{' '}
          <code className="text-xs">VITE_CRYPTO_TREASURY_ADDRESS</code> to the
          company receive wallet, rebuild, and redeploy. Until then, use{' '}
          <Link className="underline" to="/admin/payments">
            Seller payouts
          </Link>{' '}
          (MoMo / wire) instead — this page is optional.
        </p>
      ) : (
        <p className="text-sm text-muted" role="status">
          Treasury receive address{' '}
          <span className="font-mono text-ink">
            {shortenAddress(treasuryAddress!)}
          </span>
          . Convert and Pay sends on-chain funds here before recording the deal
          payment.
        </p>
      )}

      {wallet.error ? (
        <p className="ui-alert-danger" role="alert">
          {wallet.error}
        </p>
      ) : null}

      {!wallet.address ? (
        <Card>
          <CardHeader
            title="Connect wallet"
            description={
              treasuryConfigured
                ? 'Desktop: MetaMask. Mobile: WalletConnect. Connection is one click; balances are read-only via ethers.js.'
                : 'You can still connect to inspect balances, but Convert and Pay stays disabled until the treasury address is configured.'
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={wallet.isConnecting || !wallet.hasMetaMask}
              onClick={() => void handleMetaMask()}
            >
              <Wallet className="h-4 w-4" aria-hidden />
              {wallet.isConnecting ? 'Connecting…' : 'Connect MetaMask'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={wallet.isConnecting || !wallet.walletConnectConfigured}
              onClick={() => void handleWalletConnect()}
            >
              Connect WalletConnect
            </Button>
          </div>
          {!wallet.hasMetaMask ? (
            <p className="mt-3 text-sm text-muted">
              MetaMask extension not detected in this browser.
            </p>
          ) : null}
          {!wallet.walletConnectConfigured ? (
            <p className="mt-3 text-sm text-muted">
              WalletConnect needs{' '}
              <code className="text-xs">VITE_WALLETCONNECT_PROJECT_ID</code> in
              `.env.local` (from{' '}
              <a
                className="underline"
                href="https://cloud.walletconnect.com"
                target="_blank"
                rel="noreferrer"
              >
                cloud.walletconnect.com
              </a>
              ).
            </p>
          ) : null}
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[13px] text-muted">Connected</p>
                <p className="mt-1 font-mono text-sm font-semibold text-ink">
                  {shortenAddress(wallet.address)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  via{' '}
                  {wallet.connector === 'walletconnect'
                    ? 'WalletConnect'
                    : 'MetaMask'}
                  {wallet.chainId != null ? ` · chain ${wallet.chainId}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={onWrongChain ? 'warning' : 'success'}>
                  {onWrongChain ? 'Switch to Ethereum mainnet' : 'Ethereum'}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={wallet.isReadingBalances || ratesQuery.isFetching}
                  onClick={() => void handleRefresh()}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Refresh
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleDisconnect()}
                >
                  <Unplug className="h-4 w-4" aria-hidden />
                  Disconnect
                </Button>
              </div>
            </div>
          </Card>

          <WalletPortfolioPanel
            holdings={wallet.holdings}
            rates={ratesQuery.data}
            ratesLoading={ratesQuery.isLoading}
            balancesLoading={wallet.isReadingBalances}
          />

          <Card>
            <CardHeader
              title="Convert and Pay"
              description="Opens the currency conversion kit with a fresh rate lock (C-09). Requires live rates on Ethereum mainnet."
            />
            {canConvertAndPay ? (
              <Link to="/admin/wallet/convert">
                <Button type="button">Convert and Pay</Button>
              </Link>
            ) : (
              <Button type="button" disabled>
                Convert and Pay
              </Button>
            )}
            {!canConvertAndPay ? (
              <p className="mt-3 text-sm text-muted">
                {!treasuryConfigured
                  ? 'Configure VITE_CRYPTO_TREASURY_ADDRESS to enable Convert and Pay.'
                  : onWrongChain
                    ? 'Switch the wallet to Ethereum mainnet first.'
                    : ratesQuery.data?.stale
                      ? 'Live rates are stale — refresh before converting.'
                      : 'Waiting for live display rates…'}
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted">
                After conversion, the deal payment appears under{' '}
                <Link className="underline" to="/admin/payments">
                  Seller payouts
                </Link>
                .
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
