import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { DocumentStatus } from '@/types'
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

export function useDocumentCounts(landIds: string[]) {
  const { user } = useAuth()
  const sortedIds = [...landIds].sort()

  return useQuery({
    queryKey: ['document-counts', sortedIds, user?.role, user?.id],
    enabled: sortedIds.length > 0 && Boolean(user),
    queryFn: async (): Promise<Record<string, DocumentCountBucket>> => {
      let query = supabase
        .from('documents')
        .select('land_id, status')
        .in('land_id', sortedIds)

      if (user?.role === 'seller') {
        query = query.eq('assigned_to', user.id)
      }

      const { data, error } = await query
      if (error) {
        throw error
      }

      const counts: Record<string, DocumentCountBucket> = {}
      for (const landId of sortedIds) {
        counts[landId] = emptyBucket()
      }

      for (const row of data ?? []) {
        const landId = row.land_id as string
        const status = row.status as DocumentStatus
        const bucket = counts[landId] ?? emptyBucket()
        if (DOCUMENT_FOLDER_ORDER.includes(status)) {
          bucket[status] += 1
          bucket.total += 1
        }
        counts[landId] = bucket
      }

      return counts
    },
  })
}
