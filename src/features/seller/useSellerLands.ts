import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types'

const SELLER_LAND_COLUMNS = 'id, title, location, status, created_at'

export function useSellerLands(signDocumentId?: string | null) {
  const { user } = useAuth()
  const [selectedLandId, setSelectedLandId] = useState<string>('')

  const query = useQuery({
    queryKey: ['land-records', 'seller', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<LandRecord[]> => {
      const { data, error } = await supabase
        .from('land_records')
        .select(SELLER_LAND_COLUMNS)
        .eq('seller_id', user!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return (data ?? []) as LandRecord[]
    },
  })

  const signLandQuery = useQuery({
    queryKey: ['documents', 'sign-land', signDocumentId],
    enabled: Boolean(signDocumentId && user?.id),
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('documents')
        .select('land_id')
        .eq('id', signDocumentId!)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data?.land_id ?? null
    },
  })

  const resolvedLandId = useMemo(() => {
    const list = query.data ?? []

    if (
      signLandQuery.data &&
      list.some((land) => land.id === signLandQuery.data)
    ) {
      return signLandQuery.data
    }

    if (selectedLandId && list.some((land) => land.id === selectedLandId)) {
      return selectedLandId
    }

    return list[0]?.id ?? ''
  }, [query.data, selectedLandId, signLandQuery.data])

  const lands = query.data ?? []
  const selectedLand = lands.find((land) => land.id === resolvedLandId) ?? null

  return {
    lands,
    selectedLand,
    selectedLandId: resolvedLandId,
    setSelectedLandId,
    isLoading: query.isLoading || signLandQuery.isLoading,
    error: query.error ?? signLandQuery.error,
  }
}
