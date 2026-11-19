import { describe, expect, it } from 'vitest'
import {
  adminNextStatuses,
  canSubmitDraft,
  validateCreateSuggestion,
  validateTransitionComment,
} from '@/features/suggestions/validation'

describe('validateCreateSuggestion', () => {
  it('requires land, title, and body', () => {
    expect(validateCreateSuggestion({ landId: '', title: '', body: '' })).toMatch(/land/i)
    expect(
      validateCreateSuggestion({ landId: 'land-1', title: '', body: 'x' }),
    ).toMatch(/title/i)
    expect(
      validateCreateSuggestion({ landId: 'land-1', title: 'Fence', body: '' }),
    ).toMatch(/describe/i)
  })

  it('accepts a valid payload', () => {
    expect(
      validateCreateSuggestion({
        landId: 'land-1',
        title: 'Clear boundary brush',
        body: 'East fence line needs clearing before survey.',
      }),
    ).toBeNull()
  })
})

describe('adminNextStatuses', () => {
  it('maps the review workflow', () => {
    expect(adminNextStatuses('draft')).toEqual([])
    expect(adminNextStatuses('submitted')).toEqual(['under_review', 'rejected'])
    expect(adminNextStatuses('under_review')).toEqual(['approved', 'rejected'])
    expect(adminNextStatuses('approved')).toEqual([])
  })
})

describe('canSubmitDraft / comment', () => {
  it('allows only the submitter to promote a draft', () => {
    expect(canSubmitDraft('draft', 'u1', 'u1')).toBe(true)
    expect(canSubmitDraft('draft', 'u1', 'u2')).toBe(false)
    expect(canSubmitDraft('submitted', 'u1', 'u1')).toBe(false)
  })

  it('requires a transition comment', () => {
    expect(validateTransitionComment('   ')).toMatch(/comment/i)
    expect(validateTransitionComment('Looks good for survey week.')).toBeNull()
  })
})
