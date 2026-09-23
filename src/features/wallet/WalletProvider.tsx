import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { BrowserProvider, type Eip1193Provider } from 'ethers'
import EthereumProvider from '@walletconnect/ethereum-provider'
import { readWalletHoldings } from '@/features/wallet/balances'
import {
  ETHEREUM_MAINNET_CHAIN_ID,
  getWalletConnectProjectId,
  type WalletConnector,
  type WalletHolding,
} from '@/features/wallet/constants'

const SESSION_KEY = 'sashacrush.wallet.connector'

type EthereumProviderInstance = Awaited<ReturnType<typeof EthereumProvider.init>>

type Eip1193WithEvents = Eip1193Provider & {
  on?: (event: string, listener: (...args: unknown[]) => void) => void
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void
}

interface WalletContextValue {
  address: string | null
  chainId: number | null
  connector: WalletConnector | null
  holdings: WalletHolding[]
  isConnecting: boolean
  isReadingBalances: boolean
  error: string | null
  hasMetaMask: boolean
  walletConnectConfigured: boolean
  connectMetaMask: () => Promise<void>
  connectWalletConnect: () => Promise<void>
  disconnect: () => Promise<void>
  refreshBalances: () => Promise<void>
  /** BrowserProvider for read/send — null when disconnected. */
  getBrowserProvider: () => BrowserProvider | null
  clearError: () => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === 'undefined') {
    return null
  }
  const ethereum = (window as Window & { ethereum?: Eip1193Provider }).ethereum
  return ethereum ?? null
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [connector, setConnector] = useState<WalletConnector | null>(null)
  const [holdings, setHoldings] = useState<WalletHolding[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [isReadingBalances, setIsReadingBalances] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMetaMask, setHasMetaMask] = useState(false)

  const ethersProviderRef = useRef<BrowserProvider | null>(null)
  const eip1193Ref = useRef<Eip1193WithEvents | null>(null)
  const wcProviderRef = useRef<EthereumProviderInstance | null>(null)
  const listenersAttachedRef = useRef(false)

  const disconnectRef = useRef<() => Promise<void>>(async () => undefined)

  const walletConnectConfigured = Boolean(getWalletConnectProjectId())

  const clearSession = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      // ignore
    }
  }, [])

  const resetLocalState = useCallback(() => {
    ethersProviderRef.current = null
    eip1193Ref.current = null
    setAddress(null)
    setChainId(null)
    setConnector(null)
    setHoldings([])
    clearSession()
  }, [clearSession])

  const onAccountsChanged = useCallback((accounts: unknown) => {
    const list = Array.isArray(accounts) ? (accounts as string[]) : []
    if (list.length === 0) {
      void disconnectRef.current()
      return
    }
    setAddress(list[0] ?? null)
  }, [])

  const onChainChanged = useCallback((chainHex: unknown) => {
    if (typeof chainHex === 'string') {
      setChainId(Number.parseInt(chainHex, 16))
    } else if (typeof chainHex === 'number') {
      setChainId(chainHex)
    }
  }, [])

  const onProviderDisconnect = useCallback(() => {
    void disconnectRef.current()
  }, [])

  const detachListeners = useCallback(() => {
    const provider = eip1193Ref.current
    if (!provider?.removeListener || !listenersAttachedRef.current) {
      return
    }
    provider.removeListener('accountsChanged', onAccountsChanged)
    provider.removeListener('chainChanged', onChainChanged)
    provider.removeListener('disconnect', onProviderDisconnect)
    listenersAttachedRef.current = false
  }, [onAccountsChanged, onChainChanged, onProviderDisconnect])

  const disconnect = useCallback(async () => {
    setError(null)
    const wc = wcProviderRef.current
    wcProviderRef.current = null
    detachListeners()
    if (wc) {
      try {
        await wc.disconnect()
      } catch {
        // ignore
      }
    }
    resetLocalState()
  }, [detachListeners, resetLocalState])

  disconnectRef.current = disconnect

  const attachProvider = useCallback(
    async (eip1193: Eip1193WithEvents, nextConnector: WalletConnector) => {
      detachListeners()
      eip1193Ref.current = eip1193
      const browserProvider = new BrowserProvider(eip1193)
      ethersProviderRef.current = browserProvider

      if (eip1193.on) {
        eip1193.on('accountsChanged', onAccountsChanged)
        eip1193.on('chainChanged', onChainChanged)
        eip1193.on('disconnect', onProviderDisconnect)
        listenersAttachedRef.current = true
      }

      const signer = await browserProvider.getSigner()
      const nextAddress = await signer.getAddress()
      const network = await browserProvider.getNetwork()

      setAddress(nextAddress)
      setChainId(Number(network.chainId))
      setConnector(nextConnector)
      try {
        sessionStorage.setItem(SESSION_KEY, nextConnector)
      } catch {
        // ignore
      }

      setIsReadingBalances(true)
      try {
        setHoldings(await readWalletHoldings(browserProvider, nextAddress))
      } finally {
        setIsReadingBalances(false)
      }
    },
    [detachListeners, onAccountsChanged, onChainChanged, onProviderDisconnect],
  )

  const connectMetaMask = useCallback(async () => {
    setError(null)
    setIsConnecting(true)
    try {
      const injected = getInjectedProvider()
      if (!injected) {
        throw new Error(
          'MetaMask is not installed. Install the browser extension, or use WalletConnect on mobile.',
        )
      }
      await injected.request?.({ method: 'eth_requestAccounts' })
      await attachProvider(injected as Eip1193WithEvents, 'metamask')
    } catch (err) {
      await disconnect()
      const message = err instanceof Error ? err.message : 'Could not connect MetaMask.'
      setError(message)
      throw err instanceof Error ? err : new Error(message)
    } finally {
      setIsConnecting(false)
    }
  }, [attachProvider, disconnect])

  const connectWalletConnect = useCallback(async () => {
    setError(null)
    setIsConnecting(true)
    try {
      const projectId = getWalletConnectProjectId()
      if (!projectId) {
        throw new Error(
          'WalletConnect is not configured. Set VITE_WALLETCONNECT_PROJECT_ID in .env.local.',
        )
      }

      const wc = await EthereumProvider.init({
        projectId,
        chains: [ETHEREUM_MAINNET_CHAIN_ID],
        showQrModal: true,
        methods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData_v4'],
        events: ['chainChanged', 'accountsChanged'],
        metadata: {
          name: 'SashaCrush',
          description: 'CurryOctos land transactions — owner wallet (keys stay on device)',
          url: typeof window !== 'undefined' ? window.location.origin : 'https://sashacrush.com',
          icons: [],
        },
      })

      wcProviderRef.current = wc
      await wc.enable()
      await attachProvider(wc as unknown as Eip1193WithEvents, 'walletconnect')
    } catch (err) {
      await disconnect()
      const message = err instanceof Error ? err.message : 'Could not connect WalletConnect.'
      setError(message)
      throw err instanceof Error ? err : new Error(message)
    } finally {
      setIsConnecting(false)
    }
  }, [attachProvider, disconnect])

  const refreshBalances = useCallback(async () => {
    const provider = ethersProviderRef.current
    if (!provider || !address) {
      return
    }
    setIsReadingBalances(true)
    setError(null)
    try {
      setHoldings(await readWalletHoldings(provider, address))
      const network = await provider.getNetwork()
      setChainId(Number(network.chainId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh balances.')
    } finally {
      setIsReadingBalances(false)
    }
  }, [address])

  useEffect(() => {
    setHasMetaMask(Boolean(getInjectedProvider()))
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const saved = sessionStorage.getItem(SESSION_KEY)
        if (saved !== 'metamask') {
          return
        }
        const injected = getInjectedProvider()
        if (!injected?.request) {
          return
        }
        const accounts = (await injected.request({ method: 'eth_accounts' })) as string[]
        if (cancelled || !accounts?.length) {
          return
        }
        await attachProvider(injected as Eip1193WithEvents, 'metamask')
      } catch {
        clearSession()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [attachProvider, clearSession])

  useEffect(() => {
    return () => {
      detachListeners()
    }
  }, [detachListeners])

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      chainId,
      connector,
      holdings,
      isConnecting,
      isReadingBalances,
      error,
      hasMetaMask,
      walletConnectConfigured,
      connectMetaMask,
      connectWalletConnect,
      disconnect,
      refreshBalances,
      getBrowserProvider: () => ethersProviderRef.current,
      clearError: () => setError(null),
    }),
    [
      address,
      chainId,
      connector,
      holdings,
      isConnecting,
      isReadingBalances,
      error,
      hasMetaMask,
      walletConnectConfigured,
      connectMetaMask,
      connectWalletConnect,
      disconnect,
      refreshBalances,
    ],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return ctx
}
