import { Outlet } from 'react-router-dom'
import { WalletProvider } from '@/features/wallet/WalletProvider'

/** Isolates ethers / WalletConnect so they stay off the critical login path. */
export function WalletLayout() {
  return (
    <WalletProvider>
      <Outlet />
    </WalletProvider>
  )
}
