import type { DocumentStatus, UserRole } from '@/types'
import { DOCUMENT_FOLDER_LABELS } from '@/features/documents/documentFolders'

/** Workflow left→right for board / stage controls. */
export const DOCUMENT_PIPELINE_ORDER: DocumentStatus[] = [
  'draft',
  'sent',
  'signed',
  'archived',
]

export const DOCUMENT_STAGE_LABELS = DOCUMENT_FOLDER_LABELS

export type DocumentStageTransition =
  | { kind: 'allowed' }
  | { kind: 'confirm'; reason: string; confirmLabel: string; tone?: 'danger' | 'primary' }
  | { kind: 'blocked'; reason: string }

export function canEditDocumentPipeline(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'agent'
}

/**
 * Staff pipeline rules (signed is seller-only and locked):
 * - draft → sent (confirm send)
 * - draft → archived (confirm)
 * - sent → archived (confirm)
 * - archived → draft (restore)
 * - anything involving signed via staff drag/select is blocked
 */
export function evaluateDocumentStageMove(
  from: DocumentStatus,
  to: DocumentStatus,
): DocumentStageTransition {
  if (from === to) {
    return { kind: 'allowed' }
  }

  if (from === 'signed' || to === 'signed') {
    return {
      kind: 'blocked',
      reason:
        to === 'signed'
          ? 'Only the assigned seller can sign a document.'
          : 'Signed documents are locked and cannot change stage.',
    }
  }

  if (from === 'draft' && to === 'sent') {
    return {
      kind: 'confirm',
      reason: 'Send this draft to the assigned seller for signature?',
      confirmLabel: 'Send for signing',
      tone: 'primary',
    }
  }

  if (from === 'draft' && to === 'archived') {
    return {
      kind: 'confirm',
      reason: 'Archive this draft? It will leave the active pipeline.',
      confirmLabel: 'Archive',
      tone: 'danger',
    }
  }

  if (from === 'sent' && to === 'archived') {
    return {
      kind: 'confirm',
      reason: 'Archive a document that is awaiting signature?',
      confirmLabel: 'Archive',
      tone: 'danger',
    }
  }

  if (from === 'sent' && to === 'draft') {
    return {
      kind: 'confirm',
      reason: 'Recall this document to draft? The seller assignment will be cleared.',
      confirmLabel: 'Recall to draft',
      tone: 'primary',
    }
  }

  if (from === 'archived' && to === 'draft') {
    return {
      kind: 'confirm',
      reason: 'Restore this document to draft?',
      confirmLabel: 'Restore',
      tone: 'primary',
    }
  }

  return {
    kind: 'blocked',
    reason: `Cannot move from ${DOCUMENT_STAGE_LABELS[from]} to ${DOCUMENT_STAGE_LABELS[to]}.`,
  }
}

export function allowedStageTargets(from: DocumentStatus): DocumentStatus[] {
  return DOCUMENT_PIPELINE_ORDER.filter((to) => {
    const result = evaluateDocumentStageMove(from, to)
    return result.kind !== 'blocked'
  })
}
