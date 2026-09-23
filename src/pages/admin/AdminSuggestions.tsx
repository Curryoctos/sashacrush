import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { SuggestionList } from '@/features/suggestions/components/SuggestionList'
import { SuggestionSubmitForm } from '@/features/suggestions/components/SuggestionSubmitForm'
import {
  useSuggestionLands,
  useSuggestions,
} from '@/features/suggestions/useSuggestions'
import { notifyInfo, notifySuccess } from '@/features/notifications/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'
import type { SuggestionStatus } from '@/types/suggestions'

type Filter = SuggestionStatus | 'all'

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Under review' },
  { id: 'draft', label: 'Draft' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

export function AdminSuggestionsPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<Filter>('submitted')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const landsQuery = useSuggestionLands()
  const {
    suggestions,
    isLoading,
    error,
    createSuggestion,
    submitDraft,
    transitionStatus,
  } = useSuggestions(filter)

  const reviewQueueCount = useMemo(
    () =>
      suggestions.filter(
        (row) => row.status === 'submitted' || row.status === 'under_review',
      ).length,
    [suggestions],
  )

  return (
    <div className="ui-page max-w-4xl space-y-6">
      <div>
        <PageBackLink to="/admin/pipeline" label="Pipeline" />
        <PageHeader
          className="mt-3"
          eyebrow="Field input"
          title="Suggestions"
          description={
            user?.email
              ? `Signed in as ${user.email}. Review agent proposals and update status with a comment.`
              : 'Review agent proposals and update status with a comment.'
          }
          actions={
            <Button type="button" onClick={() => setShowCreate((open) => !open)}>
              {showCreate ? 'Close' : 'New suggestion'}
            </Button>
          }
        />
      </div>

      {filter === 'submitted' || filter === 'under_review' || filter === 'all' ? (
        <p className="text-sm font-medium text-muted">
          Review queue in this view: {reviewQueueCount} open item
          {reviewQueueCount === 1 ? '' : 's'}.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? 'primary' : 'secondary'}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {showCreate ? (
        <SuggestionSubmitForm
          lands={landsQuery.data ?? []}
          landsLoading={landsQuery.isLoading}
          isSubmitting={creating}
          onSubmit={async (input) => {
            setCreating(true)
            try {
              await createSuggestion(input)
              notifySuccess(input.submitNow ? 'Suggestion submitted.' : 'Draft saved.')
              setShowCreate(false)
            } catch (err) {
              notifyInfo(err instanceof Error ? err.message : 'Could not save suggestion.')
              throw err
            } finally {
              setCreating(false)
            }
          }}
        />
      ) : null}

      {isLoading ? <p className="text-sm text-muted">Loading suggestions…</p> : null}
      {error ? (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      ) : null}

      {!isLoading && !error ? (
        <SuggestionList
          suggestions={suggestions}
          userId={user?.id}
          isAdmin
          emptyTitle="No suggestions in this filter."
          onSubmitDraft={async (suggestion) => {
            await submitDraft(suggestion)
            notifySuccess('Draft submitted for review.')
          }}
          onTransition={async (input) => {
            await transitionStatus(input)
            notifySuccess('Status updated. Submitter will be emailed.')
          }}
        />
      ) : null}
    </div>
  )
}
