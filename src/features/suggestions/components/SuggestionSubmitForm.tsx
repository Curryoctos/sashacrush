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
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block space-y-1.5">
          <span className="ui-label">Land deal</span>
          <select
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
        </label>

        <label className="block space-y-1.5">
          <span className="ui-label">Title</span>
          <input
            className="ui-input"
            value={title}
            disabled={isSubmitting}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
          />
        </label>

        <label className="block space-y-1.5">
          <span className="ui-label">Description</span>
          <textarea
            className="ui-input min-h-28"
            value={body}
            disabled={isSubmitting}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            required
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={submitNow}
            disabled={isSubmitting}
            onChange={(event) => setSubmitNow(event.target.checked)}
          />
          Submit for review now (uncheck to save as draft)
        </label>

        {error ? (
          <p className="ui-alert-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting || landsLoading}>
          {isSubmitting ? 'Saving…' : submitNow ? 'Submit suggestion' : 'Save draft'}
        </Button>
      </form>
    </Card>
  )
}
