import type { ChatMessage } from '@/types'
import { formatMessageTime, resolveSenderLabel } from '@/features/chat/chat-utils'

interface ChatBubbleProps {
  message: ChatMessage
  isOwn: boolean
  currentUserId?: string
  adminUserId?: string | null
}

export function ChatBubble({
  message,
  isOwn,
  currentUserId,
  adminUserId = null,
}: ChatBubbleProps) {
  const senderLabel =
    message.sender_name ??
    resolveSenderLabel(message, currentUserId, adminUserId, new Map())

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 ${
          isOwn ? 'bg-ink text-ink-inverse' : 'bg-surface text-ink'
        }`}
      >
        <p className="text-xs font-semibold opacity-80">{senderLabel}</p>
        {message.is_auto_reply && (
          <p className="text-[10px] uppercase tracking-wide opacity-60">Bot</p>
        )}
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
        <p className={`mt-2 text-[11px] ${isOwn ? 'text-ink-inverse/70' : 'text-muted'}`}>
          {formatMessageTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}
