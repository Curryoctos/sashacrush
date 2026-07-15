import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { fetchAdminUserId } from '@/features/chat/fetchAdminUserId'
import {
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
  const [hasNewBelow, setHasNewBelow] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

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
    if (isAtBottomRef.current) {
      scrollToBottom('auto')
    } else if (messages.length > 0) {
      setHasNewBelow(true)
    }
  }, [messages, scrollToBottom])

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
    <div className="flex h-[min(70vh,720px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 space-y-4 overflow-y-auto p-4"
      >
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {!isLoading && !error && messages.length === 0 && (
          <p className="py-12 text-center text-sm text-muted">
            No messages yet. Start the conversation.
          </p>
        )}

        {!isLoading &&
          messages.map((message) => (
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

      {hasNewBelow && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-center">
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className="text-sm font-medium text-brand-700 hover:text-brand-900"
          >
            New message ↓
          </button>
        </div>
      )}

      <ChatInput onSend={sendMessage} disabled={isSending || Boolean(error)} />
    </div>
  )
}
