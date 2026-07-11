import { isAutoReplyBody } from '@/features/chat/autoReply'
import { supabase } from '@/lib/supabase'
import type { ChatMessage } from '@/types'
import type { Database } from '@/types/database'

type UserProfile = Pick<
  Database['public']['Tables']['users']['Row'],
  'id' | 'full_name' | 'email'
>

const ADMIN_DISPLAY_NAME = 'SashaCrush'

export async function fetchAdminUserId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data.id
}

export function resolveSenderLabel(
  message: ChatMessage,
  currentUserId: string | undefined,
  adminUserId: string | null,
  profiles: Map<string, UserProfile>,
): string {
  if (message.sender_id === currentUserId) {
    return 'You'
  }

  if (message.is_auto_reply || isAutoReplyBody(message.body)) {
    return 'Automated reply'
  }

  if (message.sender_id === adminUserId) {
    return ADMIN_DISPLAY_NAME
  }

  const profile = profiles.get(message.sender_id)
  return profile?.full_name ?? profile?.email ?? 'Team member'
}

export function formatMessageTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

export function messageMatchesContext(
  message: Pick<ChatMessage, 'channel' | 'land_id'>,
  channel: ChatMessage['channel'],
  landId: string | null,
): boolean {
  if (message.channel !== channel) {
    return false
  }

  if (channel === 'executive_channel' && !landId) {
    return message.land_id == null
  }

  return message.land_id === landId
}

export function countUnreadMessages(
  messages: ChatMessage[],
  currentUserId: string | undefined,
  lastReadAt: string | null,
): number {
  if (!currentUserId) {
    return 0
  }

  const lastReadTime = lastReadAt ? new Date(lastReadAt).getTime() : 0

  return messages.filter(
    (message) =>
      message.sender_id !== currentUserId &&
      new Date(message.created_at).getTime() > lastReadTime,
  ).length
}

export function unreadStorageKey(
  channel: ChatMessage['channel'],
  landId: string | null,
): string {
  return `sashacrush:chat:lastRead:${channel}:${landId ?? 'global'}`
}

export function readLastReadAt(
  channel: ChatMessage['channel'],
  landId: string | null,
): string | null {
  return localStorage.getItem(unreadStorageKey(channel, landId))
}

export function writeLastReadAt(
  channel: ChatMessage['channel'],
  landId: string | null,
  iso: string,
): void {
  localStorage.setItem(unreadStorageKey(channel, landId), iso)
}

export function getUnreadCount(
  channel: ChatMessage['channel'],
  landId: string | null,
  messages: ChatMessage[],
  currentUserId?: string,
): number {
  return countUnreadMessages(messages, currentUserId, readLastReadAt(channel, landId))
}
