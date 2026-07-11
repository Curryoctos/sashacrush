import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChatWindow } from '@/features/chat/components/ChatWindow'
import { UnreadBadge } from '@/features/chat/components/UnreadBadge'
import {
  countUnreadMessages,
  readLastReadAt,
} from '@/features/chat/chat-utils'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { ChatMessage, LandRecord } from '@/types'
import type { ChatChannel } from '@/types/database'

type AdminChatTab = 'land-owner' | 'executive'

async function fetchMessagesSnapshot(
  channel: ChatChannel,
  landId: string | null,
): Promise<ChatMessage[]> {
  let query = supabase
    .from('chat_messages')
    .select('id, channel, land_id, sender_id, body, created_at')
    .eq('channel', channel)
    .order('created_at', { ascending: true })
    .limit(100)

  if (channel === 'executive_channel' && !landId) {
    query = query.is('land_id', null)
  } else if (landId) {
    query = query.eq('land_id', landId)
  }

  const { data, error } = await query
  if (error) {
    return []
  }

  return (data ?? []) as ChatMessage[]
}

export function AdminChatPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const landFromQuery = searchParams.get('land') ?? ''
  const [activeTab, setActiveTab] = useState<AdminChatTab>('land-owner')
  const [selectedLandId, setSelectedLandId] = useState<string>(landFromQuery)

  const landsQuery = useQuery({
    queryKey: ['admin-land-records-options'],
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

  const sellerUnreadQuery = useQuery({
    queryKey: ['chat-unread', 'seller_channel', resolvedLandId],
    enabled: Boolean(resolvedLandId),
    queryFn: () => fetchMessagesSnapshot('seller_channel', resolvedLandId),
    refetchInterval: 10_000,
  })

  const executiveUnreadQuery = useQuery({
    queryKey: ['chat-unread', 'executive_channel'],
    queryFn: () => fetchMessagesSnapshot('executive_channel', null),
    refetchInterval: 10_000,
  })

  const sellerUnread = countUnreadMessages(
    sellerUnreadQuery.data ?? [],
    user?.id,
    readLastReadAt('seller_channel', resolvedLandId),
  )

  const executiveUnread = countUnreadMessages(
    executiveUnreadQuery.data ?? [],
    user?.id,
    readLastReadAt('executive_channel', null),
  )

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm text-muted">
            <Link to="/admin/dashboard" className="text-brand-700 hover:underline">
              ← Admin Dashboard
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Messages</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('land-owner')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === 'land-owner'
                ? 'bg-brand-600 text-white'
                : 'bg-white text-ink ring-1 ring-slate-200'
            }`}
          >
            Land Owner Chat
            <UnreadBadge count={sellerUnread} />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('executive')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === 'executive'
                ? 'bg-brand-600 text-white'
                : 'bg-white text-ink ring-1 ring-slate-200'
            }`}
          >
            Executive Chat
            <UnreadBadge count={executiveUnread} />
          </button>
        </div>

        {activeTab === 'land-owner' && (
          <div className="space-y-4">
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
              <ChatWindow landId={resolvedLandId} channel="seller_channel" />
            ) : (
              <p className="text-sm text-muted">Create a land record to start messaging.</p>
            )}
          </div>
        )}

        {activeTab === 'executive' && (
          <ChatWindow landId={null} channel="executive_channel" />
        )}
      </div>
    </div>
  )
}
