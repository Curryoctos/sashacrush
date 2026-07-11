import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChatWindow } from '@/features/chat/components/ChatWindow'
import { UnreadBadge } from '@/features/chat/components/UnreadBadge'
import {
  countUnreadMessages,
  readLastReadAt,
} from '@/features/chat/chat-utils'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { ChatMessage, LandRecord } from '@/types'

async function fetchMessagesSnapshot(landId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, channel, land_id, sender_id, body, created_at')
    .eq('channel', 'seller_channel')
    .eq('land_id', landId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    return []
  }

  return (data ?? []) as ChatMessage[]
}

export function AgentChatPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const landFromQuery = searchParams.get('land') ?? ''
  const [selectedLandId, setSelectedLandId] = useState<string>(landFromQuery)

  const landsQuery = useQuery({
    queryKey: ['agent-land-records-chat'],
    queryFn: async (): Promise<LandRecord[]> => {
      const { data, error } = await supabase
        .from('land_records')
        .select('id, title, location')
        .eq('status', 'active')
        .order('title')

      if (error) {
        throw error
      }

      return (data ?? []) as LandRecord[]
    },
  })

  const resolvedLandId = useMemo(() => {
    if (selectedLandId && landsQuery.data?.some((land) => land.id === selectedLandId)) {
      return selectedLandId
    }
    if (landFromQuery && landsQuery.data?.some((land) => land.id === landFromQuery)) {
      return landFromQuery
    }
    return landsQuery.data?.[0]?.id ?? null
  }, [landsQuery.data, selectedLandId, landFromQuery])

  const unreadQuery = useQuery({
    queryKey: ['agent-chat-unread', resolvedLandId],
    enabled: Boolean(resolvedLandId),
    queryFn: () => fetchMessagesSnapshot(resolvedLandId!),
    refetchInterval: 10_000,
  })

  const unreadCount = countUnreadMessages(
    unreadQuery.data ?? [],
    user?.id,
    readLastReadAt('seller_channel', resolvedLandId),
  )

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm text-muted">
            <Link to="/agent/dashboard" className="text-brand-700 hover:underline">
              ← Agent Dashboard
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Seller Messages</h1>
          <p className="mt-1 text-sm text-muted">
            Reply to land owners on behalf of the SashaCrush team.
          </p>
        </div>

        <label className="block max-w-md">
          <span className="text-sm font-medium text-ink">Land record</span>
          <select
            value={resolvedLandId ?? ''}
            onChange={(event) => setSelectedLandId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {(landsQuery.data ?? []).map((land) => (
              <option key={land.id} value={land.id}>
                {land.title}
                {land.location ? ` — ${land.location}` : ''}
              </option>
            ))}
          </select>
        </label>

        {resolvedLandId ? (
          <div>
            <p className="mb-2 text-sm text-muted">
              Unread on this property
              <UnreadBadge count={unreadCount} />
            </p>
            <ChatWindow landId={resolvedLandId} channel="seller_channel" />
          </div>
        ) : (
          <p className="text-sm text-muted">No active land records to message.</p>
        )}
      </div>
    </div>
  )
}
