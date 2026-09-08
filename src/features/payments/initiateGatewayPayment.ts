import { extractEdgeFunctionError } from '@/lib/edgeFunctionError'
import { supabase } from '@/lib/supabase'

export interface InitiateGatewayResult {
  provider: 'flutterwave'
  mode: 'payout'
  reference: string
  status: string
  reused?: boolean
  transferId?: number
}

/**
 * Start a Flutterwave mobile-money payout (company → seller).
 * Does not return a hosted checkout URL — funds leave the Flutterwave balance.
 */
export async function initiateGatewayPayment(
  paymentId: string,
): Promise<InitiateGatewayResult> {
  const { data, error } = await supabase.functions.invoke('initiate-gateway-payment', {
    body: { paymentId },
  })

  if (
    data &&
    typeof data === 'object' &&
    'success' in data &&
    data.success &&
    'reference' in data &&
    data.reference
  ) {
    return {
      provider: 'flutterwave',
      mode: 'payout',
      reference: String(data.reference),
      status: String('status' in data && data.status ? data.status : 'queued'),
      reused: Boolean('reused' in data && data.reused),
      transferId:
        'transferId' in data && data.transferId != null
          ? Number(data.transferId)
          : undefined,
    }
  }

  throw new Error(
    await extractEdgeFunctionError(error, data, 'Could not start seller payout.'),
  )
}
