import { Contract, parseUnits, type BrowserProvider } from 'ethers'
import {
  ETHEREUM_MAINNET_CHAIN_ID,
  USDT_MAINNET_ADDRESS,
  WBTC_MAINNET_ADDRESS,
  type CryptoAsset,
} from '@/features/wallet/constants'

const ERC20_TRANSFER_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount)',
] as const

export function getTreasuryAddress(): string | null {
  const value = import.meta.env.VITE_CRYPTO_TREASURY_ADDRESS
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  const address = value.trim()
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return null
  }
  return address
}

export function cryptoTypeForDb(asset: CryptoAsset): 'ETH' | 'USDT' | 'BTC' | 'WBTC' {
  if (asset === 'BTC') {
    return 'WBTC'
  }
  return asset
}

/** Send ETH or ERC-20 to the company treasury. Returns tx hash. Keys stay in the wallet. */
export async function sendTreasuryTransfer(input: {
  provider: BrowserProvider
  asset: CryptoAsset
  /** Human amount in token units (e.g. 0.01 ETH). */
  amount: number
  treasuryAddress: string
  expectedChainId?: number
}): Promise<{ txHash: string; fromAddress: string }> {
  const chainId = input.expectedChainId ?? ETHEREUM_MAINNET_CHAIN_ID
  const network = await input.provider.getNetwork()
  if (Number(network.chainId) !== chainId) {
    throw new Error('Switch to Ethereum mainnet before sending.')
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Transfer amount must be positive.')
  }

  const signer = await input.provider.getSigner()
  const fromAddress = await signer.getAddress()

  if (input.asset === 'ETH') {
    const value = parseUnits(trimAmount(input.amount, 18), 18)
    const tx = await signer.sendTransaction({
      to: input.treasuryAddress,
      value,
    })
    await tx.wait()
    return { txHash: tx.hash, fromAddress }
  }

  const contractAddress =
    input.asset === 'USDT' ? USDT_MAINNET_ADDRESS : WBTC_MAINNET_ADDRESS
  const decimals = input.asset === 'USDT' ? 6 : 8
  const token = new Contract(contractAddress, ERC20_TRANSFER_ABI, signer)
  const amount = parseUnits(trimAmount(input.amount, decimals), decimals)
  const tx = await token.transfer(input.treasuryAddress, amount)
  const receipt = await tx.wait()
  const txHash = typeof tx.hash === 'string' ? tx.hash : String(receipt?.hash ?? '')
  if (!txHash) {
    throw new Error('Wallet did not return a transaction hash.')
  }
  return { txHash, fromAddress }
}

/** Avoid scientific notation for parseUnits. */
function trimAmount(amount: number, maxDecimals: number): string {
  const fixed = amount.toFixed(maxDecimals)
  return fixed.replace(/\.?0+$/, '') || '0'
}
