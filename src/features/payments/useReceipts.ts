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
  land_title: string
}

const RECEIPT_COLUMNS = 'id, payment_id, seller_id, receipt_number, pdf_path, created_at'

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

      const paymentIds = receipts.map((receipt) => receipt.payment_id)
      const { data: payments } = await supabase
        .from('payments')
        .select('id, land_id, amount_usd, amount_ugx')
        .in('id', paymentIds)

      const paymentMap = new Map((payments ?? []).map((payment) => [payment.id, payment]))
      const landIds = [...new Set((payments ?? []).map((payment) => payment.land_id))]

      const { data: lands } = await supabase
        .from('land_records')
        .select('id, title')
        .in('id', landIds)

      const landMap = new Map((lands ?? []).map((land) => [land.id, land.title]))

      return receipts.map((receipt) => {
        const payment = paymentMap.get(receipt.payment_id)
        const landTitle = payment ? (landMap.get(payment.land_id) ?? 'Unknown property') : 'Unknown property'

        return {
          ...receipt,
          amount_usd: payment?.amount_usd ?? 0,
          amount_ugx: payment?.amount_ugx ?? null,
          land_title: landTitle,
        }
      })
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
