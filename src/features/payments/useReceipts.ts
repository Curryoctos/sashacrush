import { useQuery } from '@tanstack/react-query'
import { RECEIPTS_BUCKET } from '@/features/payments/receiptPdf'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export interface ReceiptWithDetails {
  id: string
  payment_id: string
  seller_id: string
  receipt_number: string
  pdf_path: string | null
  created_at: string
  amount_usd: number
  amount_ugx: number | null
  land_id: string | null
  land_title: string
}

const RECEIPT_COLUMNS =
  'id, payment_id, seller_id, receipt_number, pdf_path, created_at, amount_usd, amount_ugx, land_id, land_title'

export function useReceipts() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['receipts', user?.id, user?.role],
    enabled: Boolean(user),
    queryFn: async (): Promise<ReceiptWithDetails[]> => {
      let query = supabase
        .from('receipts')
        .select(RECEIPT_COLUMNS)
        .order('created_at', { ascending: false })

      if (user?.role === 'seller') {
        query = query.eq('seller_id', user.id)
      }

      const { data: receipts, error } = await query
      if (error) {
        throw error
      }

      if (!receipts?.length) {
        return []
      }

      // Amounts and land title live on receipts (seller-safe).
      // Fallback: resolve missing titles from land_records the seller can read.
      const missingLandIds = [
        ...new Set(
          receipts
            .filter((receipt) => !receipt.land_title && receipt.land_id)
            .map((receipt) => receipt.land_id!),
        ),
      ]

      const landMap = new Map<string, string>()
      if (missingLandIds.length > 0) {
        const { data: lands } = await supabase
          .from('land_records')
          .select('id, title')
          .in('id', missingLandIds)

        for (const land of lands ?? []) {
          landMap.set(land.id, land.title)
        }
      }

      return receipts.map((receipt) => ({
        ...receipt,
        amount_usd: Number(receipt.amount_usd ?? 0),
        amount_ugx: receipt.amount_ugx != null ? Number(receipt.amount_ugx) : null,
        land_title:
          receipt.land_title ??
          (receipt.land_id ? landMap.get(receipt.land_id) : undefined) ??
          'Unknown property',
      }))
    },
  })
}

export async function downloadReceiptPdf(pdfPath: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(pdfPath, 3600)

  if (error || !data?.signedUrl) {
    throw new Error('Could not download receipt PDF.')
  }

  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}
