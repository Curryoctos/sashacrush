import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AgentDashboardStats {
  activeLands: number
  docsAwaitingSign: number
  pendingPayments: number
  recentDeals: Array<{ id: string; title: string }>
}

export function useAgentDashboardStats() {
  return useQuery({
    queryKey: ['agent-dashboard-stats'],
    queryFn: async (): Promise<AgentDashboardStats> => {
      const { data: lands } = await supabase
        .from('land_records')
        .select('id, title')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      const activeLands = lands ?? []

      const { count: docsAwaitingSign } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent')

      const { count: pendingPayments } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'confirmed')

      return {
        activeLands: activeLands.length,
        docsAwaitingSign: docsAwaitingSign ?? 0,
        pendingPayments: pendingPayments ?? 0,
        recentDeals: activeLands.slice(0, 8).map((land) => ({
          id: land.id,
          title: land.title,
        })),
      }
    },
    refetchInterval: 60_000,
  })
}
