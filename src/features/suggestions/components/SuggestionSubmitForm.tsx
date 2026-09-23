import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import type { CreateSuggestionInput } from '@/features/suggestions/validation'

interface LandOption {
  id: string
  title: string
}

interface SuggestionSubmitFormProps {
  lands: LandOption[]
  landsLoading?: boolean
  isSubmitting?: boolean
  onSubmit: (input: CreateSuggestionInput) => Promise<void>
}

export function SuggestionSubmitForm({
  lands,
  landsLoading,
  isSubmitting,
  onSubmit,
}: SuggestionSubmitFormProps) {
  const [landId, setLandId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitNow, setSubmitNow] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      await onSubmit({ landId, title, body, submitNow })
      setTitle('')
      setBody('')
      setLandId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save suggestion.')
    }
  }

  return (
    <Card>
      <CardHeader
        title="New suggestion"
        description="Propose on-site work or an improvement for a land deal."
      />
      <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
        <div className="ui-field">
          <label htmlFor="suggestion-land" className="ui-label">
            Land deal
          </label>
          <select
            id="suggestion-land"
            className="ui-input"
            value={landId}
            disabled={landsLoading || isSubmitting}
            onChange={(event) => setLandId(event.target.value)}
            required
          >
            <option value="">{landsLoading ? 'Loading…' : 'Select a deal…'}</option>
            {lands.map((land) => (
              <option key={land.id} value={land.id}>
                {land.title}
              </option>
            ))}
          </select>
        </div>

        <div className="ui-field">
          <label htmlFor="suggestion-title" className="ui-label">
            Title
          </label>
          <input
            id="suggestion-title"
            className="ui-input"
            value={title}
            disabled={isSubmitting}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
            placeholder="Short summary"
          />
        </div>

        <div className="ui-field">
          <label htmlFor="suggestion-body" className="ui-label">
            Description
          </label>
          <textarea
            id="suggestion-body"
            className="ui-input min-h-28"
            value={body}
            disabled={isSubmitting}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            required
            placeholder="What should happen on site, and why?"
          />
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-border/80 bg-surface/60 px-4 py-3 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-border text-brand-700"
            checked={submitNow}
            disabled={isSubmitting}
            onChange={(event) => setSubmitNow(event.target.checked)}
          />
          <span>
            Submit for review now
            <span className="mt-0.5 block text-xs font-medium text-muted">
              Uncheck to save as a draft you can finish later.
            </span>
          </span>
        </label>

        {error ? (
          <p className="ui-alert-danger" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end border-t border-border/80 pt-4">
          <Button type="submit" disabled={isSubmitting || landsLoading} size="lg">
            {isSubmitting ? 'Saving…' : submitNow ? 'Submit suggestion' : 'Save draft'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
