import { describe, expect, it } from 'vitest'
import {
  allowedStageTargets,
  evaluateDocumentStageMove,
} from '@/features/documents/documentStages'

describe('documentStages', () => {
  it('allows draft to sent with confirm', () => {
    const result = evaluateDocumentStageMove('draft', 'sent')
    expect(result.kind).toBe('confirm')
  })

  it('blocks staff moves onto signed', () => {
    const result = evaluateDocumentStageMove('sent', 'signed')
    expect(result).toEqual({
      kind: 'blocked',
      reason: 'Only the assigned seller can sign a document.',
    })
  })

  it('blocks moves off signed', () => {
    const result = evaluateDocumentStageMove('signed', 'archived')
    expect(result.kind).toBe('blocked')
  })

  it('lists only legal targets including current', () => {
    expect(allowedStageTargets('draft')).toEqual(['draft', 'sent', 'archived'])
    expect(allowedStageTargets('signed')).toEqual(['signed'])
  })
})
