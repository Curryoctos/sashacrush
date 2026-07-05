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
        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
          isOwn ? 'text-white' : 'bg-slate-100 text-ink'
        }`}
        style={isOwn ? { backgroundColor: '#2D6A4F' } : undefined}
      >
        <p className="text-xs font-semibold opacity-80">{senderLabel}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
        <p className={`mt-2 text-[11px] ${isOwn ? 'text-white/70' : 'text-muted'}`}>
          {formatMessageTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}
