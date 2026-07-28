import { extractEdgeFunctionError } from '@/lib/edgeFunctionError'
import { supabase } from '@/lib/supabase'

/**
 * Confirm a payment and issue a receipt via the confirm-payment edge function.
 * Receipt PDF generation and storage upload happen server-side (BR-02).
 */
export async function confirmPaymentWithReceipt(paymentId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('confirm-payment', {
    body: { paymentId },
  })

  if (data && typeof data === 'object' && 'receiptNumber' in data && data.receiptNumber) {
    return String(data.receiptNumber)
  }

  throw new Error(await extractEdgeFunctionError(error, data, 'Could not confirm payment.'))
}
