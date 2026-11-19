/** Ethereum mainnet defaults for C-16/C-17 wallet reads. Keys never leave the device. */

export const ETHEREUM_MAINNET_CHAIN_ID = 1

/** USDT (ERC-20) on Ethereum mainnet. */
export const USDT_MAINNET_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'

/** WBTC (ERC-20) — EVM proxy for BTC holdings in MetaMask / WalletConnect. */
export const WBTC_MAINNET_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'

/** Minimal ERC-20 ABI for balanceOf + decimals + symbol. */
export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
] as const

export type WalletConnector = 'metamask' | 'walletconnect'

/** Display assets for C-17 portfolio (BTC via WBTC on Ethereum). */
export type CryptoAsset = 'BTC' | 'ETH' | 'USDT'

export interface WalletHolding {
  asset: CryptoAsset
  /** Human-readable balance in token units. */
  balance: number
  /** Raw balance string for precision display. */
  balanceFormatted: string
  decimals: number
  contractAddress: string | null
  /** Extra hint for UI (e.g. WBTC). */
  sourceLabel?: string
}

export function shortenAddress(address: string): string {
  if (address.length < 10) {
    return address
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function getWalletConnectProjectId(): string | null {
  const value = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  return value.trim()
}
