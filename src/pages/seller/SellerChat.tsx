import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChatWindow } from '@/features/chat/components/ChatWindow'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types'

export function SellerChatPage() {
  const { user } = useAuth()

  const { data: land, isLoading } = useQuery({
    queryKey: ['seller-land', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<LandRecord | null> => {
      const { data, error } = await supabase
        .from('land_records')
        .select('id, title')
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data as LandRecord | null
    },
  })

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm text-muted">
            <Link to="/seller/dashboard" className="text-brand-700 hover:underline">
              ← Seller Dashboard
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Messages</h1>
          {land?.title && (
            <p className="mt-1 text-sm text-muted">Regarding: {land.title}</p>
          )}
        </div>

        {isLoading && <p className="text-sm text-muted">Loading your conversation…</p>}

        {!isLoading && !land && (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-muted">
            No land record is assigned to your account yet. Messages will be available once
            admin assigns a property to you.
          </p>
        )}

        {!isLoading && land && (
          <ChatWindow landId={land.id} channel="seller_channel" />
        )}
      </div>
    </div>
  )
}
