import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AgentDashboardStats {
  activeLands: number
  docsAwaitingSign: number
  pendingPayments: number
}

export function useAgentDashboardStats() {
  return useQuery({
    queryKey: ['agent-dashboard-stats'],
    queryFn: async (): Promise<AgentDashboardStats> => {
      const { count: activeLands } = await supabase
        .from('land_records')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')

      const { count: docsAwaitingSign } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent')

      const { count: pendingPayments } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'confirmed')

      return {
        activeLands: activeLands ?? 0,
        docsAwaitingSign: docsAwaitingSign ?? 0,
        pendingPayments: pendingPayments ?? 0,
      }
    },
    refetchInterval: 60_000,
  })
}
