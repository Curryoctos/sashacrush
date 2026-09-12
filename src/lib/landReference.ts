/**
 * Stable land reference for receipts and admin UI (plan C-10).
 * Format: SC-XXXXXXXX from the land UUID (no hardcoded deal names).
 */
export function landReferenceFromId(landId: string): string {
  const compact = landId.replace(/-/g, '').toUpperCase()
  return `SC-${compact.slice(0, 8)}`
}

/** Plan C-15 manual reconciliation code: WU-{landShort}-{timestamp}. */
export function generateManualPaymentReference(landId: string): string {
  const landShort = landId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `WU-${landShort}-${Date.now()}`
}
