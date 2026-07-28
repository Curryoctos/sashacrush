import { useQuery } from '@tanstack/react-query'
import {
  countUnreadMessages,
  readLastReadAt,
} from '@/features/chat/chat-utils'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { ChatMessage, Document, LandRecord } from '@/types'

export interface DealSummary {
  land: LandRecord & { seller_name: string | null }
  payments: Array<{ id: string; amount_usd: number; status: string }>
  documents: Pick<Document, 'status'>[]
  unreadCount: number
}

export function useDealSummary(landId: string, includeUnread = false) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['deal-summary', landId, includeUnread, user?.id],
    enabled: Boolean(landId),
    queryFn: async (): Promise<DealSummary> => {
      const { data: land, error: landError } = await supabase
        .from('land_records')
        .select(
          'id, title, description, location, total_value_usd, seller_id, latitude, longitude, status, created_at',
        )
        .eq('id', landId)
        .single()

      if (landError || !land) {
        throw landError ?? new Error('Land record not found')
      }

      let sellerName: string | null = null
      if (land.seller_id) {
        const { data: seller } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', land.seller_id)
          .maybeSingle()

        sellerName = seller?.full_name ?? seller?.email ?? null
      }

      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount_usd, status')
        .eq('land_id', landId)
        .order('created_at', { ascending: false })

      const { data: documents } = await supabase
        .from('documents')
        .select('status')
        .eq('land_id', landId)

      let unreadCount = 0
      if (includeUnread && user?.id) {
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('id, channel, land_id, sender_id, body, created_at')
          .eq('channel', 'seller_channel')
          .eq('land_id', landId)
          .order('created_at', { ascending: true })
          .limit(100)

        unreadCount = countUnreadMessages(
          (messages ?? []) as ChatMessage[],
          user.id,
          readLastReadAt('seller_channel', landId),
        )
      }

      return {
        land: { ...(land as LandRecord), seller_name: sellerName },
        payments: payments ?? [],
        documents: documents ?? [],
        unreadCount,
      }
    },
  })
}

export interface ExecutiveDealSummary {
  land_id: string
  title: string
  location: string | null
  status: string
  total_value_usd: number
  seller_name: string | null
  pending_docs: number
  signed_docs: number
  confirmed_payments: number
  pending_payments: number
}

export function useExecutiveDeals() {
  return useQuery({
    queryKey: ['executive-deals'],
    queryFn: async (): Promise<ExecutiveDealSummary[]> => {
      const { data, error } = await supabase.rpc('executive_deal_summaries')

      if (error) {
        throw error
      }

      return (data ?? []) as ExecutiveDealSummary[]
    },
  })
}

export function useExecutiveDeal(landId: string) {
  return useQuery({
    queryKey: ['executive-deal', landId],
    enabled: Boolean(landId),
    queryFn: async (): Promise<ExecutiveDealSummary | null> => {
      const { data, error } = await supabase.rpc('executive_deal_summary', {
        p_land_id: landId,
      })

      if (error) {
        throw error
      }

      const rows = (data ?? []) as ExecutiveDealSummary[]
      return rows[0] ?? null
    },
  })
}
