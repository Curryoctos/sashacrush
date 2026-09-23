import { useState } from 'react'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/PageHeader'
import {
  adminNextStatuses,
  canSubmitDraft,
} from '@/features/suggestions/validation'
import { useSuggestionComments } from '@/features/suggestions/useSuggestions'
import { formatDateTime } from '@/lib/formatters'
import {
  SUGGESTION_STATUS_LABEL,
  type SuggestionStatus,
  type SuggestionWithMeta,
} from '@/types/suggestions'

interface SuggestionListProps {
  suggestions: SuggestionWithMeta[]
  userId?: string
  isAdmin?: boolean
  emptyTitle?: string
  onSubmitDraft?: (suggestion: SuggestionWithMeta) => Promise<void>
  onTransition?: (input: {
    suggestionId: string
    nextStatus: SuggestionStatus
    comment: string
  }) => Promise<void>
}

export function SuggestionList({
  suggestions,
  userId,
  isAdmin,
  emptyTitle = 'No suggestions yet.',
  onSubmitDraft,
  onTransition,
}: SuggestionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (suggestions.length === 0) {
    return <EmptyState title={emptyTitle} />
  }

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion) => {
        const expanded = expandedId === suggestion.id
        return (
          <Card key={suggestion.id} padding="sm">
            <button
              type="button"
              className="flex w-full flex-wrap items-start justify-between gap-3 text-left"
              onClick={() => setExpandedId(expanded ? null : suggestion.id)}
            >
              <div>
                <p className="font-medium text-ink">{suggestion.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {suggestion.land_title ?? 'Deal'} ·{' '}
                  {suggestion.submitter_name ?? suggestion.submitter_email ?? 'Submitter'} ·{' '}
                  {formatDateTime(suggestion.updated_at)}
                </p>
              </div>
              <Badge
                tone={
                  suggestion.status === 'under_review'
                    ? 'brand'
                    : suggestion.status === 'approved'
                      ? 'success'
                      : statusTone(suggestion.status)
                }
              >
                {SUGGESTION_STATUS_LABEL[suggestion.status]}
              </Badge>
            </button>

            {expanded ? (
              <SuggestionDetail
                suggestion={suggestion}
                userId={userId}
                isAdmin={isAdmin}
                onSubmitDraft={onSubmitDraft}
                onTransition={onTransition}
              />
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}

function SuggestionDetail({
  suggestion,
  userId,
  isAdmin,
  onSubmitDraft,
  onTransition,
}: {
  suggestion: SuggestionWithMeta
  userId?: string
  isAdmin?: boolean
  onSubmitDraft?: SuggestionListProps['onSubmitDraft']
  onTransition?: SuggestionListProps['onTransition']
}) {
  const commentsQuery = useSuggestionComments(suggestion.id)
  const nextStatuses = isAdmin ? adminNextStatuses(suggestion.status) : []
  const [nextStatus, setNextStatus] = useState<SuggestionStatus | ''>(
    nextStatuses[0] ?? '',
  )
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmitDraft = async () => {
    if (!onSubmitDraft) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmitDraft(suggestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit draft.')
    } finally {
      setBusy(false)
    }
  }

  const handleTransition = async () => {
    if (!onTransition || !nextStatus) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onTransition({
        suggestionId: suggestion.id,
        nextStatus,
        comment,
      })
      setComment('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      <p className="whitespace-pre-wrap text-sm text-ink">{suggestion.body}</p>

      {canSubmitDraft(suggestion.status, suggestion.submitter_id, userId) && onSubmitDraft ? (
        <Button type="button" size="sm" disabled={busy} onClick={() => void handleSubmitDraft()}>
          Submit for review
        </Button>
      ) : null}

      {isAdmin && nextStatuses.length > 0 && onTransition ? (
        <Card padding="sm">
          <CardHeader
            title="Update status"
            description="Comment is required on each admin transition."
          />
          <div className="space-y-5">
            <div className="ui-field">
              <label htmlFor="suggestion-next-status" className="ui-label">
                Next status
              </label>
              <select
                id="suggestion-next-status"
                className="ui-input"
                value={nextStatus}
                disabled={busy}
                onChange={(event) => setNextStatus(event.target.value as SuggestionStatus)}
              >
                {nextStatuses.map((status) => (
                  <option key={status} value={status}>
                    {SUGGESTION_STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="ui-field">
              <label htmlFor="suggestion-comment" className="ui-label">
                Comment
              </label>
              <textarea
                id="suggestion-comment"
                className="ui-input"
                value={comment}
                disabled={busy}
                onChange={(event) => setComment(event.target.value)}
                required
                placeholder="Required note for the submitter…"
              />
            </div>
            <div className="flex justify-end border-t border-border/80 pt-4">
              <Button
                type="button"
                disabled={busy || !nextStatus}
                onClick={() => void handleTransition()}
                size="lg"
              >
                {busy ? 'Saving…' : 'Apply status change'}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {error ? (
        <p className="ui-alert-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Thread</p>
        {commentsQuery.isLoading ? (
          <p className="mt-2 text-sm text-muted">Loading comments…</p>
        ) : (commentsQuery.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted">No status comments yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {(commentsQuery.data ?? []).map((entry) => (
              <li key={entry.id} className="rounded-md bg-surface px-3 py-2 text-sm">
                <p className="text-ink">{entry.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {entry.status_from && entry.status_to
                    ? `${SUGGESTION_STATUS_LABEL[entry.status_from]} → ${SUGGESTION_STATUS_LABEL[entry.status_to]} · `
                    : null}
                  {formatDateTime(entry.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
