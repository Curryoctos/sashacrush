import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ArrowLeft, Building2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import {
  DealCards,
  FolderCards,
  HierarchyNav,
} from '@/components/hierarchy/Hierarchy'
import { ChatWindow } from '@/features/chat/components/ChatWindow'
import { UnreadBadge } from '@/features/chat/components/UnreadBadge'
import {
  countUnreadMessages,
  readLastReadAt,
} from '@/features/chat/chat-utils'
import { useLandHierarchyNav } from '@/hooks/useLandHierarchyNav'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { ChatMessage, LandRecord } from '@/types'
import type { ChatChannel } from '@/types/database'

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
  const landsQuery = useQuery({
    queryKey: ['admin-land-records-options'],
    queryFn: async (): Promise<LandRecord[]> => {
      const { data, error } = await supabase
        .from('land_records')
        .select('id, title')
        .eq('status', 'active')
        .order('title')

      if (error) {
        throw error
      }

      return (data ?? []) as LandRecord[]
    },
  })

  const lands = landsQuery.data ?? []
  const { selectedLandId, selectedLand, selectedFolder, setNavigation } =
    useLandHierarchyNav(lands)

  const channel =
    selectedFolder === 'executive'
      ? 'executive'
      : selectedFolder === 'land-owner' || selectedLandId
        ? 'land-owner'
        : null

  const sellerUnreadQuery = useQuery({
    queryKey: ['chat-unread', 'seller_channel', selectedLandId],
    enabled: Boolean(selectedLandId),
    queryFn: () => fetchMessagesSnapshot('seller_channel', selectedLandId),
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
    readLastReadAt('seller_channel', selectedLandId),
  )

  const executiveUnread = countUnreadMessages(
    executiveUnreadQuery.data ?? [],
    user?.id,
    readLastReadAt('executive_channel', null),
  )

  const dealCards = useMemo(
    () =>
      lands.map((land) => ({
        id: land.id,
        title: land.title,
        hint: 'Open conversation',
      })),
    [lands],
  )

  return (
    <div className="ui-page max-w-4xl">
      <div>
        <PageBackLink to="/admin/dashboard" label="Admin Dashboard" />
        <PageHeader
          className="mt-3"
          title="Messages"
          description="Open a channel, then a deal when needed."
        />
      </div>

      {!channel && (
        <FolderCards
          folders={[
            {
              id: 'land-owner',
              title: 'Land owner chat',
              description: 'Deal-scoped seller conversations',
              icon: <Building2 className="h-5 w-5" />,
              onSelect: () => setNavigation(null, 'land-owner'),
            },
            {
              id: 'executive',
              title: 'Executive chat',
              description: 'Staff leadership channel',
              icon: <MessageSquare className="h-5 w-5" />,
              count: executiveUnread > 0 ? executiveUnread : undefined,
              onSelect: () => setNavigation(null, 'executive'),
            },
          ]}
        />
      )}

      {channel === 'executive' && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              { label: 'Channels', onClick: () => setNavigation(null, null) },
              { label: 'Executive chat' },
            ]}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="ui-section-title">Executive chat</h2>
              <UnreadBadge count={executiveUnread} />
            </div>
            <Button variant="secondary" size="sm" onClick={() => setNavigation(null, null)}>
              <ArrowLeft className="h-4 w-4" />
              Channels
            </Button>
          </div>
          <ChatWindow landId={null} channel="executive_channel" />
        </div>
      )}

      {channel === 'land-owner' && !selectedLand && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              { label: 'Channels', onClick: () => setNavigation(null, null) },
              { label: 'Land owner chat' },
            ]}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="ui-section-title">Land owner chat</h2>
            <Button variant="secondary" size="sm" onClick={() => setNavigation(null, null)}>
              <ArrowLeft className="h-4 w-4" />
              Channels
            </Button>
          </div>
          {landsQuery.isLoading ? (
            <p className="text-sm text-muted">Loading deals…</p>
          ) : (
            <DealCards
              deals={dealCards}
              onSelect={(id) => setNavigation(id, 'land-owner')}
              emptyTitle="No deals yet"
              emptyDescription="Create a land record to start messaging."
              prompt="Select a deal to open the conversation."
            />
          )}
        </div>
      )}

      {channel === 'land-owner' && selectedLand && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              { label: 'Channels', onClick: () => setNavigation(null, null) },
              {
                label: 'Land owner chat',
                onClick: () => setNavigation(null, 'land-owner'),
              },
              { label: selectedLand.title },
            ]}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="ui-section-title">{selectedLand.title}</h2>
              <UnreadBadge count={sellerUnread} />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setNavigation(null, 'land-owner')}
            >
              <ArrowLeft className="h-4 w-4" />
              Deals
            </Button>
          </div>
          <ChatWindow landId={selectedLand.id} channel="seller_channel" />
        </div>
      )}
    </div>
  )
}
