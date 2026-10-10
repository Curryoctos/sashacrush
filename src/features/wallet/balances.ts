import { Contract, formatUnits, type BrowserProvider } from 'ethers'
import {
  ERC20_ABI,
  USDT_MAINNET_ADDRESS,
  WBTC_MAINNET_ADDRESS,
  type CryptoAsset,
  type WalletHolding,
} from '@/features/wallet/constants'

async function readErc20Holding(
  provider: BrowserProvider,
  address: string,
  contractAddress: string,
  asset: CryptoAsset,
  fallbackDecimals: number,
  sourceLabel?: string,
): Promise<WalletHolding> {
  try {
    const token = new Contract(contractAddress, ERC20_ABI, provider)
    const [raw, decimals] = await Promise.all([
      token.balanceOf(address) as Promise<bigint>,
      token.decimals() as Promise<number>,
    ])
    const formatted = formatUnits(raw, decimals)
    return {
      asset,
      balance: Number(formatted),
      balanceFormatted: formatted,
      decimals: Number(decimals),
      contractAddress,
      sourceLabel,
    }
  } catch {
    return {
      asset,
      balance: 0,
      balanceFormatted: '0',
      decimals: fallbackDecimals,
      contractAddress,
      sourceLabel,
    }
  }
}

export async function readWalletHoldings(
  provider: BrowserProvider,
  address: string,
): Promise<WalletHolding[]> {
  const ethBalance = await provider.getBalance(address)
  const ethFormatted = formatUnits(ethBalance, 18)

  const [btc, usdt] = await Promise.all([
    readErc20Holding(provider, address, WBTC_MAINNET_ADDRESS, 'BTC', 8, 'WBTC'),
    readErc20Holding(provider, address, USDT_MAINNET_ADDRESS, 'USDT', 6),
  ])

  return [
    btc,
    {
      asset: 'ETH',
      balance: Number(ethFormatted),
      balanceFormatted: ethFormatted,
      decimals: 18,
      contractAddress: null,
    },
    usdt,
  ]
}
