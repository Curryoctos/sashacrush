import { useQuery } from '@tanstack/react-query'
import {
  countUnreadMessages,
  fetchAdminUserId,
  readLastReadAt,
} from '@/features/chat/chat-utils'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { ChatMessage } from '@/types'

export interface AdminDashboardStats {
  activeLands: number
  pendingPayments: number
  docsAwaitingSign: number
  unreadMessages: number
  recentDeals: Array<{ id: string; title: string; location: string | null }>
}

export function useAdminDashboardStats() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['admin-dashboard-stats', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<AdminDashboardStats> => {
      const { data: lands } = await supabase
        .from('land_records')
        .select('id, title, location, status')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      const activeLands = lands ?? []
      const landIds = activeLands.map((land) => land.id)

      let pendingPayments = 0
      if (landIds.length > 0) {
        const { count } = await supabase
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .neq('status', 'confirmed')

        pendingPayments = count ?? 0
      }

      let docsAwaitingSign = 0
      if (landIds.length > 0) {
        const { count } = await supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'sent')

        docsAwaitingSign = count ?? 0
      }

      let unreadMessages = 0
      const adminUserId = await fetchAdminUserId()

      if (landIds.length > 0 && adminUserId) {
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('id, channel, land_id, sender_id, body, created_at')
          .eq('channel', 'seller_channel')
          .in('land_id', landIds)
          .order('created_at', { ascending: true })
          .limit(500)

        for (const landId of landIds) {
          const landMessages = ((messages ?? []) as ChatMessage[]).filter(
            (message) => message.land_id === landId,
          )
          unreadMessages += countUnreadMessages(
            landMessages,
            adminUserId,
            readLastReadAt('seller_channel', landId),
          )
        }
      }

      return {
        activeLands: activeLands.length,
        pendingPayments,
        docsAwaitingSign,
        unreadMessages,
        recentDeals: activeLands.slice(0, 5).map((land) => ({
          id: land.id,
          title: land.title,
          location: land.location,
        })),
      }
    },
    refetchInterval: 30_000,
  })
}

export function useAdminUnreadMessages() {
  const stats = useAdminDashboardStats()
  return stats.data?.unreadMessages ?? 0
}
