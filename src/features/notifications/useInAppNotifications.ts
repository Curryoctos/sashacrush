import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export interface InAppNotification {
  id: string
  user_id: string
  title: string
  body: string
  href: string | null
  read_at: string | null
  created_at: string
}

const NOTIFICATION_COLUMNS = 'id, user_id, title, body, href, read_at, created_at'

export function useInAppNotifications(limit = 20) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['in-app-notifications', user?.id, limit],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<InAppNotification[]> => {
      const { data, error } = await supabase
        .from('in_app_notifications')
        .select(NOTIFICATION_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      return (data ?? []) as InAppNotification[]
    },
    refetchInterval: 30_000,
  })

  const unreadCount = (query.data ?? []).filter((entry) => !entry.read_at).length

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('in_app_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unreadIds = (query.data ?? [])
        .filter((entry) => !entry.read_at)
        .map((entry) => entry.id)

      if (unreadIds.length === 0) {
        return
      }

      const { error } = await supabase
        .from('in_app_notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] })
    },
  })

  return {
    notifications: query.data ?? [],
    unreadCount,
    isLoading: query.isLoading,
    error: query.error,
    markRead: markRead.mutateAsync,
    markAllRead: markAllRead.mutateAsync,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] }),
  }
}
