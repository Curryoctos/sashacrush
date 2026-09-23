import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { fetchAdminUserId } from '@/features/chat/fetchAdminUserId'
import {
  filterMessagesByQuery,
  writeLastReadAt,
} from '@/features/chat/chat-utils'
import { useChat } from '@/features/chat/useChat'
import { ChatBubble } from '@/features/chat/components/ChatBubble'
import { ChatInput } from '@/features/chat/components/ChatInput'
import type { ChatChannel } from '@/types/database'

interface ChatWindowProps {
  landId: string | null
  channel: ChatChannel
}

export function ChatWindow({ landId, channel }: ChatWindowProps) {
  const { user } = useAuth()
  const { messages, sendMessage, isLoading, error, isSending } = useChat(landId, channel)
  const [adminUserId, setAdminUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [hasNewBelow, setHasNewBelow] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  const visibleMessages = useMemo(
    () => filterMessagesByQuery(messages, searchQuery),
    [messages, searchQuery],
  )

  useEffect(() => {
    void fetchAdminUserId().then(setAdminUserId)
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
    setHasNewBelow(false)
    isAtBottomRef.current = true

    const latest = messages.at(-1)
    if (latest) {
      writeLastReadAt(channel, landId, latest.created_at)
    }
  }, [channel, landId, messages])

  useEffect(() => {
    if (searchQuery.trim()) {
      return
    }
    if (isAtBottomRef.current) {
      scrollToBottom('auto')
    } else if (messages.length > 0) {
      setHasNewBelow(true)
    }
  }, [messages, scrollToBottom, searchQuery])

  useEffect(() => {
    const latest = messages.at(-1)
    if (latest && isAtBottomRef.current) {
      writeLastReadAt(channel, landId, latest.created_at)
    }
  }, [channel, landId, messages])

  const handleScroll = () => {
    const element = listRef.current
    if (!element) {
      return
    }

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight
    isAtBottomRef.current = distanceFromBottom < 48

    if (isAtBottomRef.current) {
      setHasNewBelow(false)
      const latest = messages.at(-1)
      if (latest) {
        writeLastReadAt(channel, landId, latest.created_at)
      }
    }
  }

  return (
    <div className="ui-panel flex h-[min(70vh,720px)] flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <label className="block space-y-1.5">
          <span className="ui-label">Search history</span>
          <input
            className="ui-input"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Filter by message or sender…"
            aria-label="Search message history"
          />
        </label>
      </div>

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 space-y-4 overflow-y-auto p-4"
      >
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="ui-skeleton h-16" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <p className="ui-alert-danger" role="alert">
            {error}
          </p>
        )}

        {!isLoading && !error && messages.length === 0 && (
          <p className="py-12 text-center text-sm text-muted">
            No messages yet. Start the conversation.
          </p>
        )}

        {!isLoading &&
          !error &&
          messages.length > 0 &&
          visibleMessages.length === 0 && (
            <p className="py-12 text-center text-sm text-muted">
              No messages match “{searchQuery.trim()}”.
            </p>
          )}

        {!isLoading &&
          visibleMessages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === user?.id}
              currentUserId={user?.id}
              adminUserId={adminUserId}
            />
          ))}

        <div ref={bottomRef} />
      </div>

      {hasNewBelow && !searchQuery.trim() && (
        <div className="border-t border-border bg-surface px-4 py-2 text-center">
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className="text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            New message ↓
          </button>
        </div>
      )}

      <ChatInput onSend={sendMessage} disabled={isSending || Boolean(error)} />
    </div>
  )
}
