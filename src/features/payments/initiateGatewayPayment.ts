import { extractEdgeFunctionError } from '@/lib/edgeFunctionError'
import { supabase } from '@/lib/supabase'

export async function initiateGatewayPayment(paymentId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('initiate-gateway-payment', {
    body: { paymentId },
  })

  if (data && typeof data === 'object' && 'checkoutUrl' in data && data.checkoutUrl) {
    return String(data.checkoutUrl)
  }

  throw new Error(
    await extractEdgeFunctionError(error, data, 'Could not start gateway checkout.'),
  )
}
