import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
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
  { id: 'draft', label: 'My drafts' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Under review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

export function AgentSuggestionsPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<Filter>('all')
  const [creating, setCreating] = useState(false)
  const landsQuery = useSuggestionLands()
  const { suggestions, isLoading, error, createSuggestion, submitDraft } =
    useSuggestions(filter)

  const visible = suggestions.filter((row) =>
    filter === 'draft' ? row.submitter_id === user?.id : true,
  )

  return (
    <div className="ui-page max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Field input"
        title="Suggestions"
        description={
          user?.email
            ? `Signed in as ${user.email}. Propose on-site work; admin reviews and comments on status changes.`
            : 'Propose on-site work; admin reviews and comments on status changes.'
        }
      />

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

      <SuggestionSubmitForm
        lands={landsQuery.data ?? []}
        landsLoading={landsQuery.isLoading}
        isSubmitting={creating}
        onSubmit={async (input) => {
          setCreating(true)
          try {
            await createSuggestion(input)
            notifySuccess(input.submitNow ? 'Suggestion submitted for admin review.' : 'Draft saved.')
          } catch (err) {
            notifyInfo(err instanceof Error ? err.message : 'Could not save suggestion.')
            throw err
          } finally {
            setCreating(false)
          }
        }}
      />

      {isLoading ? <p className="text-sm text-muted">Loading suggestions…</p> : null}
      {error ? (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      ) : null}

      {!isLoading && !error ? (
        <SuggestionList
          suggestions={visible}
          userId={user?.id}
          emptyTitle="No suggestions yet — submit one above."
          onSubmitDraft={async (suggestion) => {
            await submitDraft(suggestion)
            notifySuccess('Draft submitted for admin review.')
          }}
        />
      ) : null}
    </div>
  )
}
