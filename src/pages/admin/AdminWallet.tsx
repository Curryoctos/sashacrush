import { Link } from 'react-router-dom'
import { RefreshCw, Unplug, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { WalletPortfolioPanel } from '@/features/wallet/components/WalletPortfolioPanel'
import { useWallet } from '@/features/wallet/WalletProvider'
import { ETHEREUM_MAINNET_CHAIN_ID, shortenAddress } from '@/features/wallet/constants'
import { useWalletDisplayRates } from '@/features/wallet/useWalletDisplayRates'
import { useAuth } from '@/hooks/useAuth'
import { notifyInfo, notifySuccess } from '@/features/notifications/useNotifications'

export function AdminWalletPage() {
  const { user } = useAuth()
  const wallet = useWallet()
  const ratesQuery = useWalletDisplayRates(Boolean(wallet.address))

  const onWrongChain =
    wallet.address != null &&
    wallet.chainId != null &&
    wallet.chainId !== ETHEREUM_MAINNET_CHAIN_ID

  const handleMetaMask = async () => {
    try {
      await wallet.connectMetaMask()
      notifySuccess('MetaMask connected. Balances are read-only — keys stay on your device.')
    } catch (err) {
      notifyInfo(err instanceof Error ? err.message : 'Could not connect MetaMask.')
    }
  }

  const handleWalletConnect = async () => {
    try {
      await wallet.connectWalletConnect()
      notifySuccess('Wallet connected via WalletConnect. Keys stay on your device.')
    } catch (err) {
      notifyInfo(err instanceof Error ? err.message : 'Could not connect WalletConnect.')
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
  const canConvertAndPay = Boolean(wallet.address && ratesReady && !onWrongChain)

  return (
    <div className="ui-page max-w-4xl space-y-6">
      <div>
        <PageBackLink to="/admin/finance" label="Finance" />
        <PageHeader
          className="mt-3"
          eyebrow="Web3"
          title="Owner wallet"
          description={
            user?.email
              ? `Signed in as ${user.email}. Connect MetaMask or WalletConnect. SashaCrush never asks for or stores private keys.`
              : 'Connect MetaMask or WalletConnect. SashaCrush never asks for or stores private keys.'
          }
        />
      </div>

      {wallet.error ? (
        <p className="ui-alert-danger" role="alert">
          {wallet.error}
        </p>
      ) : null}

      {!wallet.address ? (
        <Card>
          <CardHeader
            title="Connect wallet"
            description="Desktop: MetaMask. Mobile: WalletConnect. Connection is one click; balances are read-only via ethers.js."
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
              WalletConnect needs <code className="text-xs">VITE_WALLETCONNECT_PROJECT_ID</code> in
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
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  Connected
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-ink">
                  {shortenAddress(wallet.address)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  via {wallet.connector === 'walletconnect' ? 'WalletConnect' : 'MetaMask'}
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
                {onWrongChain
                  ? 'Switch the wallet to Ethereum mainnet first.'
                  : ratesQuery.data?.stale
                    ? 'Live rates are stale — refresh before converting.'
                    : 'Waiting for live display rates…'}
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Seller payouts after conversion settle through{' '}
                <Link className="underline" to="/admin/payments">
                  Payments
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
