import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from '@/hooks/useAuth'
import { getAutoReply, isAutoReplyBody, shouldAutoReply } from '@/features/chat/autoReply'
import { notifyAdminSellerMessage, notifySellerAdminMessage } from '@/features/chat/notify'
import {
  fetchAdminUserId,
  messageMatchesContext,
} from '@/features/chat/chat-utils'
import { formatSupabaseError, isRlsViolation } from '@/lib/supabase-errors'
import { supabase } from '@/lib/supabase'
import type { ChatMessage } from '@/types'
import type { ChatChannel } from '@/types/database'
import type { Database } from '@/types/database'

type UserProfile = Pick<
  Database['public']['Tables']['users']['Row'],
  'id' | 'full_name' | 'email'
>

const HISTORY_LIMIT = 100

function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

function buildHistoryQuery(channel: ChatChannel, landId: string | null) {
  let query = supabase
    .from('chat_messages')
    .select('id, channel, land_id, sender_id, body, created_at')
    .eq('channel', channel)
    .order('created_at', { ascending: true })
    .limit(HISTORY_LIMIT)

  if (channel === 'executive_channel' && !landId) {
    query = query.is('land_id', null)
  } else if (landId) {
    query = query.eq('land_id', landId)
  }

  return query
}

async function enrichMessages(
  rows: ChatMessage[],
  currentUserId: string | undefined,
  _adminUserId: string | null,
  channel: ChatChannel,
  userRole: string | undefined,
): Promise<ChatMessage[]> {
  const senderIds = [...new Set(rows.map((row) => row.sender_id))]
  const profiles = new Map<string, UserProfile>()

  if (senderIds.length > 0) {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email')
      .in('id', senderIds)

    for (const profile of data ?? []) {
      profiles.set(profile.id, profile)
    }
  }

  return rows.map((row) => {
    const profile = profiles.get(row.sender_id)
    const isFromCurrentUser = row.sender_id === currentUserId
    const isAutoReply = isAutoReplyBody(row.body)

    let senderName = profile?.full_name ?? profile?.email
    if (channel === 'seller_channel' && userRole === 'seller' && !isFromCurrentUser) {
      senderName = isAutoReply ? 'Automated reply' : 'SashaCrush'
    } else if (isAutoReply) {
      senderName = 'Automated reply'
    }

    return {
      ...row,
      is_auto_reply: isAutoReply,
      sender_name: senderName,
    }
  })
}

export function useChat(landId: string | null, channel: ChatChannel) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const adminUserIdRef = useRef<string | null>(null)
  const realtimeRef = useRef<RealtimeChannel | null>(null)

  const normalizedLandId = landId || null

  const loadMessages = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!adminUserIdRef.current) {
        adminUserIdRef.current = await fetchAdminUserId()
      }

      const { data, error: queryError } = await buildHistoryQuery(
        channel,
        normalizedLandId,
      )

      if (queryError) {
        if (isRlsViolation(queryError)) {
          setMessages([])
          setError('You do not have permission to view this conversation.')
          return
        }
        throw queryError
      }

      const enriched = await enrichMessages(
        (data ?? []) as ChatMessage[],
        user?.id,
        adminUserIdRef.current,
        channel,
        user?.role,
      )
      setMessages(sortMessages(enriched))
    } catch (err) {
      setMessages([])
      setError(formatSupabaseError(err as Error))
    } finally {
      setIsLoading(false)
    }
  }, [channel, normalizedLandId, user?.id, user?.role])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    const topic = `chat:${channel}:${normalizedLandId ?? 'global'}`
    const filter =
      channel === 'executive_channel' && !normalizedLandId
        ? `channel=eq.${channel}`
        : `channel=eq.${channel},land_id=eq.${normalizedLandId}`

    const realtimeChannel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter,
        },
        (payload) => {
          const incoming = payload.new as ChatMessage
          if (
            !messageMatchesContext(incoming, channel, normalizedLandId)
          ) {
            return
          }

          void (async () => {
            if (!adminUserIdRef.current) {
              adminUserIdRef.current = await fetchAdminUserId()
            }

            const [enriched] = await enrichMessages(
              [incoming],
              user?.id,
              adminUserIdRef.current,
              channel,
              user?.role,
            )

            setMessages((current) => {
              if (current.some((message) => message.id === enriched.id)) {
                return current
              }
              return sortMessages([...current, enriched])
            })
          })()
        },
      )
      .subscribe()

    realtimeRef.current = realtimeChannel

    return () => {
      if (realtimeRef.current) {
        void supabase.removeChannel(realtimeRef.current)
        realtimeRef.current = null
      }
    }
  }, [channel, normalizedLandId, user?.id, user?.role])

  const sendMessage = useCallback(
    async (body: string) => {
      const trimmed = body.trim()
      if (!trimmed || !user) {
        return
      }

      setIsSending(true)
      setError(null)

      try {
        const { data: inserted, error: insertError } = await supabase
          .from('chat_messages')
          .insert({
            channel,
            land_id: normalizedLandId,
            sender_id: user.id,
            body: trimmed,
          })
          .select('id')
          .single()

        if (insertError) {
          if (isRlsViolation(insertError)) {
            setError('You do not have permission to send messages in this conversation.')
            return
          }
          throw insertError
        }

        let autoReplySent = false

        if (shouldAutoReply(channel) && user.role === 'seller' && normalizedLandId) {
          const reply = getAutoReply(trimmed)
          if (reply) {
            autoReplySent = true
            window.setTimeout(() => {
              void supabase
                .rpc('send_chat_auto_reply', {
                  p_land_id: normalizedLandId,
                  p_body: reply,
                })
                .then(({ error: replyError }) => {
                  if (replyError) {
                    console.error('Auto-reply failed:', replyError.message)
                  }
                })
            }, 1000)
          }
        }

        if (
          user.role === 'seller' &&
          normalizedLandId &&
          inserted?.id &&
          !autoReplySent
        ) {
          void notifyAdminSellerMessage(inserted.id, normalizedLandId)
        }

        if (
          (user.role === 'admin' || user.role === 'agent') &&
          normalizedLandId &&
          inserted?.id &&
          channel === 'seller_channel'
        ) {
          void notifySellerAdminMessage(inserted.id, normalizedLandId)
        }
      } catch (err) {
        setError(formatSupabaseError(err as Error))
      } finally {
        setIsSending(false)
      }
    },
    [channel, normalizedLandId, user],
  )

  return {
    messages,
    sendMessage,
    isLoading,
    error,
    isSending,
    reload: loadMessages,
  }
}
