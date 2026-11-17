import { extractEdgeFunctionError } from '@/lib/edgeFunctionError'
import { supabase } from '@/lib/supabase'

export type ProjectContributionMethod =
  | 'stripe'
  | 'mobile_money'
  | 'wire'
  | 'crypto'

export interface InitiateProjectContributionInput {
  projectId: string
  amountUsd: number
  method: ProjectContributionMethod
  contributorName: string
  contributorEmail: string
  contributorCountry?: string
  isAnonymous?: boolean
  payerPhone?: string
  mobileMoneyNetwork?: 'mtn' | 'airtel'
}

export interface InitiateProjectContributionResult {
  contributionId: string
  reference: string
  status: string
  checkoutUrl: string | null
  message?: string
}

export async function initiateProjectContribution(
  input: InitiateProjectContributionInput,
): Promise<InitiateProjectContributionResult> {
  const { data, error } = await supabase.functions.invoke(
    'initiate-project-contribution',
    {
      body: {
        projectId: input.projectId,
        amountUsd: input.amountUsd,
        method: input.method,
        contributorName: input.contributorName,
        contributorEmail: input.contributorEmail,
        contributorCountry: input.contributorCountry ?? null,
        isAnonymous: input.isAnonymous ?? false,
        payerPhone: input.payerPhone ?? null,
        mobileMoneyNetwork: input.mobileMoneyNetwork ?? null,
      },
    },
  )

  if (
    data &&
    typeof data === 'object' &&
    'success' in data &&
    data.success &&
    'contributionId' in data &&
    'reference' in data
  ) {
    return {
      contributionId: String(data.contributionId),
      reference: String(data.reference),
      status: String('status' in data ? data.status : 'pending'),
      checkoutUrl:
        'checkoutUrl' in data && typeof data.checkoutUrl === 'string'
          ? data.checkoutUrl
          : null,
      message:
        'message' in data && typeof data.message === 'string'
          ? data.message
          : undefined,
    }
  }

  throw new Error(
    await extractEdgeFunctionError(
      error,
      data,
      'Could not start contribution.',
    ),
  )
}
