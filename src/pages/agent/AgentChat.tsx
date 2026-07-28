import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { DealCards, HierarchyNav } from '@/components/hierarchy/Hierarchy'
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

  const landsQuery = useQuery({
    queryKey: ['agent-land-records-chat'],
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
  const { selectedLandId, selectedLand, setNavigation } = useLandHierarchyNav(lands)

  const unreadQuery = useQuery({
    queryKey: ['agent-chat-unread', selectedLandId],
    enabled: Boolean(selectedLandId),
    queryFn: () => fetchMessagesSnapshot(selectedLandId!),
    refetchInterval: 10_000,
  })

  const unreadCount = countUnreadMessages(
    unreadQuery.data ?? [],
    user?.id,
    readLastReadAt('seller_channel', selectedLandId),
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
        <PageBackLink to="/agent/dashboard" label="Agent Dashboard" />
        <PageHeader
          className="mt-3"
          title="Seller Messages"
          description="Select a deal to open the conversation."
        />
      </div>

      {landsQuery.isLoading && <p className="text-sm text-muted">Loading deals…</p>}

      {!selectedLand && !landsQuery.isLoading && (
        <DealCards
          deals={dealCards}
          onSelect={(id) => setNavigation(id, null)}
          emptyTitle="No active deals"
          emptyDescription="No land records to message yet."
          prompt="Select a deal to message the land owner."
        />
      )}

      {selectedLand && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              { label: 'All deals', onClick: () => setNavigation(null, null) },
              { label: selectedLand.title },
            ]}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="ui-section-title">{selectedLand.title}</h2>
              <UnreadBadge count={unreadCount} />
            </div>
            <Button variant="secondary" size="sm" onClick={() => setNavigation(null, null)}>
              <ArrowLeft className="h-4 w-4" />
              All deals
            </Button>
          </div>
          <ChatWindow landId={selectedLand.id} channel="seller_channel" />
        </div>
      )}
    </div>
  )
}
