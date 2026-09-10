import { extractEdgeFunctionError } from '@/lib/edgeFunctionError'
import { supabase } from '@/lib/supabase'

export interface InitiateInvestmentCheckoutResult {
  investmentId: string
  reference: string
  checkoutUrl: string
  sessionId: string
}

/** Start Stripe Checkout to fund company capital (executive → company). */
export async function initiateInvestmentCheckout(input: {
  amountUsd: number
  notes?: string | null
}): Promise<InitiateInvestmentCheckoutResult> {
  const { data, error } = await supabase.functions.invoke('initiate-investment-checkout', {
    body: {
      amountUsd: input.amountUsd,
      notes: input.notes ?? null,
    },
  })

  if (
    data &&
    typeof data === 'object' &&
    'success' in data &&
    data.success &&
    'checkoutUrl' in data &&
    typeof data.checkoutUrl === 'string' &&
    data.checkoutUrl
  ) {
    return {
      investmentId: String('investmentId' in data ? data.investmentId : ''),
      reference: String('reference' in data ? data.reference : ''),
      checkoutUrl: data.checkoutUrl,
      sessionId: String('sessionId' in data ? data.sessionId : ''),
    }
  }

  throw new Error(
    await extractEdgeFunctionError(error, data, 'Could not start Stripe Checkout.'),
  )
}
