import { useQuery } from '@tanstack/react-query'
import { fetchWalletDisplayRates } from '@/features/wallet/displayRates'

/** C-17 display rates — poll about once a minute while mounted. */
export function useWalletDisplayRates(enabled: boolean) {
  return useQuery({
    queryKey: ['wallet', 'display-rates'],
    enabled,
    queryFn: () => fetchWalletDisplayRates(),
    refetchInterval: 60_000,
    staleTime: 55_000,
    retry: 1,
  })
}
