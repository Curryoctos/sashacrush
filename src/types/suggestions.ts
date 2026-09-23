export type SuggestionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'

export interface Suggestion {
  id: string
  land_id: string
  submitter_id: string
  title: string
  body: string
  status: SuggestionStatus
  created_at: string
  updated_at: string
}

export interface SuggestionComment {
  id: string
  suggestion_id: string
  author_id: string
  body: string
  status_from: SuggestionStatus | null
  status_to: SuggestionStatus | null
  created_at: string
}

export interface SuggestionWithMeta extends Suggestion {
  land_title: string | null
  submitter_name: string | null
  submitter_email: string | null
}

export const SUGGESTION_STATUS_LABEL: Record<SuggestionStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const SUGGESTION_COLUMNS =
  'id, land_id, submitter_id, title, body, status, created_at, updated_at'
