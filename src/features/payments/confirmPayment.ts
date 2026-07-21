import { supabase } from '@/lib/supabase'

export function buildReceiptNumber(existingCount: number): string {
  const year = new Date().getFullYear()
  const sequence = String(existingCount + 1).padStart(4, '0')
  return `RCP-${year}-${sequence}`
}

function extractFunctionError(error: unknown, data: unknown): string {
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return String(data.error)
  }

  if (error && typeof error === 'object' && 'context' in error) {
    const contextBody = (error as { context?: { body?: unknown } }).context?.body
    if (contextBody && typeof contextBody === 'object' && 'error' in contextBody) {
      return String((contextBody as { error: unknown }).error)
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Could not confirm payment.'
}

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

  throw new Error(extractFunctionError(error, data))
}
