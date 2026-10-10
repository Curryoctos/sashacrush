export type PaymentFolderId = 'balance' | 'collect' | 'needs-action' | 'history'

export const PAYMENT_FOLDER_ORDER: PaymentFolderId[] = [
  'balance',
  'collect',
  'needs-action',
  'history',
]

/** Single outbound workflow: project purchases / disbursements. */
export const PAYMENT_FOLDER_LABELS: Record<PaymentFolderId, string> = {
  balance: 'Budget',
  collect: 'Purchase',
  'needs-action': 'Needs action',
  history: 'History',
}

export const PAYMENT_FOLDER_DESCRIPTIONS: Record<PaymentFolderId, string> = {
  balance: 'Spent vs funding goal for this project',
  collect: 'Record a purchase or disbursement toward the project — with a reason',
  'needs-action': 'Clear pending MoMo and manual purchase payouts',
  history: 'Past purchases, reasons, and receipts',
}

/** @deprecated Use PAYMENT_FOLDER_LABELS — land/project folders are unified. */
export const PROJECT_PURCHASE_FOLDER_LABELS = PAYMENT_FOLDER_LABELS

/** @deprecated Use PAYMENT_FOLDER_DESCRIPTIONS */
export const PROJECT_PURCHASE_FOLDER_DESCRIPTIONS = PAYMENT_FOLDER_DESCRIPTIONS

export function isPaymentFolder(value: string | null | undefined): value is PaymentFolderId {
  return (
    value === 'balance' ||
    value === 'collect' ||
    value === 'needs-action' ||
    value === 'history'
  )
}
