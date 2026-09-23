import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/PageHeader'
import { useIncubationSchedule } from '@/features/community/useCommunity'
import { notifyInfo, notifySuccess } from '@/features/notifications/useNotifications'
import { formatDateTime } from '@/lib/formatters'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function CommunitySchedulePage({ compact = false }: { compact?: boolean }) {
  const { events, isLoading, error, isAdmin, createEvent, deleteEvent } = useIncubationSchedule()
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  const onCreate = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await createEvent({
        title,
        startsAt: new Date(startsAt).toISOString(),
        location,
        description,
      })
      notifySuccess('Incubation date added.')
      setTitle('')
      setStartsAt('')
      setLocation('')
      setDescription('')
      setShowCreate(false)
    } catch (err) {
      notifyInfo(err instanceof Error ? err.message : 'Could not add event.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {compact ? (
            <h2 className="ui-section-title">Incubation schedule</h2>
          ) : (
            <h1 className="font-display text-3xl font-semibold text-ink">Incubation schedule</h1>
          )}
          <p className={compact ? 'ui-section-desc' : 'mt-2 text-sm text-muted'}>
            Upcoming dates for visitors and collaborators.
          </p>
        </div>
        {isAdmin ? (
          <Button type="button" onClick={() => setShowCreate((open) => !open)}>
            {showCreate ? 'Close' : 'Add date'}
          </Button>
        ) : null}
      </div>

      {isAdmin && showCreate ? (
        <Card>
          <CardHeader title="Add date" description="Visible on the public community schedule." />
          <form className="space-y-5" onSubmit={(event) => void onCreate(event)}>
            <div className="ui-field-row">
              <div className="ui-field">
                <label htmlFor="schedule-title" className="ui-label">
                  Title
                </label>
                <input
                  id="schedule-title"
                  className="ui-input"
                  value={title}
                  disabled={busy}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  placeholder="Open house · Mubende"
                />
              </div>
              <div className="ui-field">
                <label htmlFor="schedule-starts" className="ui-label">
                  Starts
                </label>
                <input
                  id="schedule-starts"
                  className="ui-input"
                  type="datetime-local"
                  value={startsAt}
                  disabled={busy}
                  onChange={(event) => setStartsAt(event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="ui-field">
              <label htmlFor="schedule-location" className="ui-label">
                Location
              </label>
              <input
                id="schedule-location"
                className="ui-input"
                value={location}
                disabled={busy}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Site address or meeting point"
              />
            </div>
            <div className="ui-field">
              <label htmlFor="schedule-notes" className="ui-label">
                Notes
              </label>
              <textarea
                id="schedule-notes"
                className="ui-input"
                value={description}
                disabled={busy}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What visitors should know…"
              />
            </div>
            <div className="flex justify-end border-t border-border/80 pt-4">
              <Button type="submit" disabled={busy} size="lg">
                {busy ? 'Saving…' : 'Add to schedule'}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {isLoading ? <p className="text-sm text-muted">Loading schedule…</p> : null}
      {error ? (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      ) : null}

      {!isLoading && !error && events.length === 0 ? (
        <EmptyState title="No upcoming dates." description="Check back soon for incubation visits." />
      ) : null}

      <div className="space-y-3">
        {events.map((item) => (
          <Card key={item.id} padding="sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{formatDateTime(item.starts_at)}</p>
                {item.location ? <p className="mt-1 text-sm text-muted">{item.location}</p> : null}
                {item.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{item.description}</p>
                ) : null}
              </div>
              {isAdmin ? (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    void deleteEvent(item.id).then(
                      () => notifySuccess('Date removed.'),
                      (err: unknown) =>
                        notifyInfo(err instanceof Error ? err.message : 'Could not delete.'),
                    )
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
