export type PaymentFolderId = 'balance' | 'collect' | 'needs-action' | 'history'

export const PAYMENT_FOLDER_ORDER: PaymentFolderId[] = [
  'balance',
  'collect',
  'needs-action',
  'history',
]

export const PAYMENT_FOLDER_LABELS: Record<PaymentFolderId, string> = {
  balance: 'Balance',
  collect: 'Pay out',
  'needs-action': 'Needs action',
  history: 'History',
}

export const PAYMENT_FOLDER_DESCRIPTIONS: Record<PaymentFolderId, string> = {
  balance: 'Paid vs outstanding for this deal',
  collect: 'Disburse funds to the seller',
  'needs-action': 'Queued MoMo payouts and manual confirms',
  history: 'Past payouts and receipts',
}

export function isPaymentFolder(value: string | null | undefined): value is PaymentFolderId {
  return (
    value === 'balance' ||
    value === 'collect' ||
    value === 'needs-action' ||
    value === 'history'
  )
}
