import type { ChatChannel } from '@/types/database'

export type { ChatChannel }

/** Chat message row with optional display metadata for the UI. */
export interface ChatMessage {
  id: string
  channel: ChatChannel
  land_id: string | null
  sender_id: string
  body: string
  created_at: string
  sender_name?: string
  is_auto_reply?: boolean
}

export type ChatMessageInsert = Pick<
  ChatMessage,
  'channel' | 'land_id' | 'sender_id' | 'body'
>
