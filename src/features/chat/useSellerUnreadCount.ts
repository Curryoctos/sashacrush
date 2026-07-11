import { useQuery } from '@tanstack/react-query'
import { getUnreadCount } from '@/features/chat/chat-utils'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { ChatMessage } from '@/types'

export function useSellerUnreadCount() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['seller-unread', user?.id],
    enabled: Boolean(user?.id && user.role === 'seller'),
    queryFn: async (): Promise<number> => {
      const { data: lands, error: landsError } = await supabase
        .from('land_records')
        .select('id')
        .eq('seller_id', user!.id)
        .eq('status', 'active')

      if (landsError) {
        throw landsError
      }

      const landIds = (lands ?? []).map((land) => land.id)
      if (landIds.length === 0) {
        return 0
      }

      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('id, channel, land_id, sender_id, body, created_at')
        .eq('channel', 'seller_channel')
        .in('land_id', landIds)
        .order('created_at', { ascending: true })
        .limit(200)

      if (messagesError) {
        throw messagesError
      }

      return landIds.reduce((total, landId) => {
        const landMessages = (messages ?? []).filter(
          (message) => message.land_id === landId,
        ) as ChatMessage[]

        return total + getUnreadCount('seller_channel', landId, landMessages, user!.id)
      }, 0)
    },
    refetchInterval: 30_000,
  })
}
