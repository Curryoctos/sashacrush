import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AuditEntry {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string
  metadata: Record<string, unknown> | null
  created_at: string
  actor_email: string | null
}

export function useAuditLog(limit = 100) {
  return useQuery({
    queryKey: ['audit-log', limit],
    queryFn: async (): Promise<AuditEntry[]> => {
      const { data: entries, error } = await supabase
        .from('audit_log')
        .select('id, actor_id, action, entity_type, entity_id, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      const actorIds = [
        ...new Set((entries ?? []).map((entry) => entry.actor_id).filter(Boolean)),
      ] as string[]

      const actorEmails = new Map<string, string>()
      if (actorIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, email')
          .in('id', actorIds)

        for (const user of users ?? []) {
          actorEmails.set(user.id, user.email)
        }
      }

      return (entries ?? []).map((entry) => ({
        ...entry,
        metadata: entry.metadata as Record<string, unknown> | null,
        actor_email: entry.actor_id ? (actorEmails.get(entry.actor_id) ?? null) : null,
      }))
    },
  })
}
