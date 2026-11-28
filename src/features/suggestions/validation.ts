import type { SuggestionStatus } from '@/types/suggestions'

export interface CreateSuggestionInput {
  landId: string
  title: string
  body: string
  /** When true, insert as submitted instead of draft. */
  submitNow?: boolean
}

export interface TransitionSuggestionInput {
  suggestionId: string
  nextStatus: SuggestionStatus
  comment: string
}

const TITLE_MAX = 120
const BODY_MAX = 4000
const COMMENT_MAX = 2000

export function validateCreateSuggestion(input: CreateSuggestionInput): string | null {
  if (!input.landId?.trim()) {
    return 'Select a land deal for this suggestion.'
  }
  const title = input.title?.trim() ?? ''
  if (!title) {
    return 'Title is required.'
  }
  if (title.length > TITLE_MAX) {
    return `Title must be ${TITLE_MAX} characters or fewer.`
  }
  const body = input.body?.trim() ?? ''
  if (!body) {
    return 'Describe the suggestion.'
  }
  if (body.length > BODY_MAX) {
    return `Description must be ${BODY_MAX} characters or fewer.`
  }
  return null
}

export function validateTransitionComment(comment: string): string | null {
  const value = comment?.trim() ?? ''
  if (!value) {
    return 'Add a comment explaining this status change.'
  }
  if (value.length > COMMENT_MAX) {
    return `Comment must be ${COMMENT_MAX} characters or fewer.`
  }
  return null
}

/** Admin-allowed next statuses from the current status. */
export function adminNextStatuses(current: SuggestionStatus): SuggestionStatus[] {
  switch (current) {
    case 'submitted':
      return ['under_review', 'rejected']
    case 'under_review':
      return ['approved', 'rejected']
    default:
      return []
  }
}

export function canSubmitDraft(
  status: SuggestionStatus,
  submitterId: string,
  userId: string | undefined,
): boolean {
  return status === 'draft' && Boolean(userId) && submitterId === userId
}
