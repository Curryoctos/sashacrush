/** Bump with a migration that updates current_investment_terms_version(). */
export const INVESTMENT_TERMS_VERSION = '2026-09-21'

export const INVESTMENT_TERMS_TITLE = 'Investment terms & conditions'

/** Shown before the deal investment portal unlocks. */
export const INVESTMENT_TERMS_SECTIONS: Array<{ heading: string; body: string }> = [
  {
    heading: 'Deal investments & capital pool',
    body: 'You invest toward a specific land deal/project. Confirmed amounts are credited to the company capital pool and earmarked for that deal. The pool funds land acquisitions and related operations according to company policy.',
  },
  {
    heading: 'Confirmation & timing',
    body: 'Card payments confirm when the payment provider settles. Bank transfer and mobile money investments stay pending until an administrator confirms receipt. Pending amounts are not treated as available capital.',
  },
  {
    heading: 'Agreements & disclosures',
    body: 'You must review and hand-sign any investment agreements sent to you before investing. Unsigned agreements block access to the payment portal until completed.',
  },
  {
    heading: 'Your responsibility',
    body: 'You confirm that you are authorized to invest, that payment details you submit are accurate, and that you understand investments may involve risk. Do not commit funds you cannot afford.',
  },
  {
    heading: 'Records & communications',
    body: 'We keep a record of your acceptance of these terms and of signed agreements. Important notices may be sent in-app or by email to your account address.',
  },
]
