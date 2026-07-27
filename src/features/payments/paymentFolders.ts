export type PaymentFolderId = 'balance' | 'collect' | 'needs-action' | 'history'

export const PAYMENT_FOLDER_ORDER: PaymentFolderId[] = [
  'balance',
  'collect',
  'needs-action',
  'history',
]

export const PAYMENT_FOLDER_LABELS: Record<PaymentFolderId, string> = {
  balance: 'Balance',
  collect: 'Collect',
  'needs-action': 'Needs action',
  history: 'History',
}

export const PAYMENT_FOLDER_DESCRIPTIONS: Record<PaymentFolderId, string> = {
  balance: 'Paid vs outstanding for this deal',
  collect: 'Start a new payment checkout',
  'needs-action': 'Pending checkouts and confirmations',
  history: 'Past payments and receipts',
}

export function isPaymentFolder(value: string | null | undefined): value is PaymentFolderId {
  return (
    value === 'balance' ||
    value === 'collect' ||
    value === 'needs-action' ||
    value === 'history'
  )
}
