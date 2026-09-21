/** Bump with a migration that updates current_investment_terms_version(). */
export const INVESTMENT_TERMS_VERSION = '2026-09-21'

export const INVESTMENT_TERMS_TITLE = 'Investment terms & conditions'

/** Concise capital-pool terms shown before the contribution portal unlocks. */
export const INVESTMENT_TERMS_SECTIONS: Array<{ heading: string; body: string }> = [
  {
    heading: 'Company capital pool',
    body: 'Contributions fund SashaCrush’s company capital pool. Confirmed capital may be used for land acquisitions and related operations according to company policy. Your contribution is recorded against your investor account.',
  },
  {
    heading: 'Confirmation & timing',
    body: 'Card payments confirm when the payment provider settles. Bank transfer and mobile money contributions stay pending until an administrator confirms receipt. Pending amounts are not treated as available capital.',
  },
  {
    heading: 'Agreements & disclosures',
    body: 'You must review and hand-sign any investment agreements sent to you before contributing. Unsigned agreements block access to the payment portal until completed.',
  },
  {
    heading: 'Your responsibility',
    body: 'You confirm that you are authorized to invest, that payment details you submit are accurate, and that you understand capital contributions may involve risk. Do not contribute funds you cannot afford to commit.',
  },
  {
    heading: 'Records & communications',
    body: 'We keep a record of your acceptance of these terms and of signed agreements. Important notices may be sent in-app or by email to your account address.',
  },
]
