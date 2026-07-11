import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { formatUsd } from '@/lib/land-records'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types'

const LAND_COLUMNS =
  'id, title, description, location, total_value_usd, seller_id, status, created_at'

export function AgentLandRecordsPage() {
  const { user } = useAuth()

  const landsQuery = useQuery({
    queryKey: ['land-records', 'agent'],
    queryFn: async (): Promise<(LandRecord & { seller_label: string })[]> => {
      const { data: lands, error } = await supabase
        .from('land_records')
        .select(LAND_COLUMNS)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      const sellerIds = [
        ...new Set((lands ?? []).map((land) => land.seller_id).filter(Boolean)),
      ] as string[]

      const sellerLabels = new Map<string, string>()
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase
          .from('users')
          .select('id, email, full_name')
          .in('id', sellerIds)

        for (const seller of sellers ?? []) {
          sellerLabels.set(seller.id, seller.full_name ?? seller.email)
        }
      }

      return (lands ?? []).map((land) => ({
        ...(land as LandRecord),
        seller_label: land.seller_id
          ? (sellerLabels.get(land.seller_id) ?? 'Unknown seller')
          : 'Unassigned',
      }))
    },
  })

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-ink">Land Records</h1>
          <p className="mt-1 text-sm text-muted">Signed in as {user?.email} — read-only view</p>
        </div>

        {landsQuery.isLoading && <p className="text-sm text-muted">Loading land records…</p>}

        {landsQuery.error && (
          <p className="text-sm text-red-700" role="alert">
            {formatSupabaseError(landsQuery.error as Error)}
          </p>
        )}

        {landsQuery.data && landsQuery.data.length === 0 && (
          <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-muted">
            No land records yet.
          </p>
        )}

        {landsQuery.data && landsQuery.data.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-ink">Property</th>
                  <th className="px-4 py-3 font-medium text-ink">Location</th>
                  <th className="px-4 py-3 font-medium text-ink">Seller</th>
                  <th className="px-4 py-3 font-medium text-ink">Value</th>
                  <th className="px-4 py-3 font-medium text-ink">Status</th>
                  <th className="px-4 py-3 font-medium text-ink">Deal</th>
                </tr>
              </thead>
              <tbody>
                {landsQuery.data.map((land) => (
                  <tr key={land.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{land.title}</td>
                    <td className="px-4 py-3 text-muted">{land.location}</td>
                    <td className="px-4 py-3 text-muted">{land.seller_label}</td>
                    <td className="px-4 py-3 text-ink">{formatUsd(land.total_value_usd)}</td>
                    <td className="px-4 py-3 capitalize text-muted">{land.status}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/agent/deals/${land.id}`}
                        className="text-brand-700 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
