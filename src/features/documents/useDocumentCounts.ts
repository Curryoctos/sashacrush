import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { DocumentScope, DocumentStatus } from '@/types'
import { DOCUMENT_FOLDER_ORDER } from '@/features/documents/documentFolders'

export type DocumentCountBucket = Record<DocumentStatus, number> & { total: number }

function emptyBucket(): DocumentCountBucket {
  return {
    total: 0,
    draft: 0,
    sent: 0,
    signed: 0,
    archived: 0,
  }
}

function isAssigneeRole(role: string | null | undefined): boolean {
  return role === 'seller' || role === 'executive'
}

export function useDocumentCounts(
  scopeIds: string[],
  options?: { scope?: DocumentScope },
) {
  const scope = options?.scope ?? 'land'
  const { user } = useAuth()
  const sortedIds = [...scopeIds].sort()

  return useQuery({
    queryKey: ['document-counts', scope, sortedIds, user?.role, user?.id],
    enabled: sortedIds.length > 0 && Boolean(user),
    queryFn: async (): Promise<Record<string, DocumentCountBucket>> => {
      let query = supabase.from('documents').select('land_id, investor_id, status')

      if (scope === 'investor') {
        query = query.in('investor_id', sortedIds)
      } else {
        query = query.in('land_id', sortedIds)
      }

      if (isAssigneeRole(user?.role)) {
        query = query.eq('assigned_to', user!.id)
      }

      const { data, error } = await query
      if (error) {
        throw error
      }

      const counts: Record<string, DocumentCountBucket> = {}
      for (const scopeId of sortedIds) {
        counts[scopeId] = emptyBucket()
      }

      for (const row of data ?? []) {
        const scopeId =
          scope === 'investor'
            ? (row.investor_id as string | null)
            : (row.land_id as string | null)
        if (!scopeId) {
          continue
        }
        const status = row.status as DocumentStatus
        const bucket = counts[scopeId] ?? emptyBucket()
        if (DOCUMENT_FOLDER_ORDER.includes(status)) {
          bucket[status] += 1
          bucket.total += 1
        }
        counts[scopeId] = bucket
      }

      return counts
    },
  })
}
