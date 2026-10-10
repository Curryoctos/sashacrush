export interface ContributeAmountState {
  amountUsd: number
  minContributionUsd: number
  fundingGoalUsd: number
}

export function validateContributeAmount(state: ContributeAmountState): string | null {
  if (!Number.isFinite(state.amountUsd) || state.amountUsd <= 0) {
    return 'Enter a valid contribution amount.'
  }
  if (state.amountUsd < state.minContributionUsd) {
    return `Minimum contribution is $${state.minContributionUsd}.`
  }
  return null
}

export function contributionGoalPercent(
  amountUsd: number,
  fundingGoalUsd: number,
): number {
  if (!Number.isFinite(amountUsd) || !Number.isFinite(fundingGoalUsd) || fundingGoalUsd <= 0) {
    return 0
  }
  return Math.round((amountUsd / fundingGoalUsd) * 10000) / 100
}

export function anonymousDisplayName(
  isAnonymous: boolean,
  fullName: string,
): string {
  return isAnonymous ? 'Anonymous' : fullName.trim()
}
