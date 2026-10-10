/**
 * Stable land reference for receipts and admin UI (plan C-10).
 * Format: SC-XXXXXXXX from the land UUID (no hardcoded deal names).
 */
export function landReferenceFromId(landId: string): string {
  const compact = landId.replace(/-/g, '').toUpperCase()
  return `SC-${compact.slice(0, 8)}`
}

/** Plan C-15 manual reconciliation code: WU-{entityShort}-{timestamp}. */
export function generateManualPaymentReference(entityId: string): string {
  const entityShort = entityId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `WU-${entityShort}-${Date.now()}`
}

/** Stable project reference for purchase UI (mirrors landReferenceFromId). */
export function projectReferenceFromId(projectId: string): string {
  const compact = projectId.replace(/-/g, '').toUpperCase()
  return `SC-P-${compact.slice(0, 8)}`
}
