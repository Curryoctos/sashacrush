import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/PageHeader'
import { useIncubationSchedule } from '@/features/community/useCommunity'
import { notifyInfo, notifySuccess } from '@/features/notifications/useNotifications'
import { formatDateTime } from '@/lib/formatters'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function CommunitySchedulePage() {
  const { events, isLoading, error, isAdmin, createEvent, deleteEvent } = useIncubationSchedule()
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
    } catch (err) {
      notifyInfo(err instanceof Error ? err.message : 'Could not add event.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Incubation schedule</h1>
        <p className="mt-2 text-sm text-muted">Upcoming dates for visitors and collaborators.</p>
      </div>

      {isAdmin ? (
        <Card>
          <CardHeader title="Add date" description="Visible on the public community schedule." />
          <form className="space-y-3" onSubmit={(event) => void onCreate(event)}>
            <label className="block space-y-1.5">
              <span className="ui-label">Title</span>
              <input
                className="ui-input"
                value={title}
                disabled={busy}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="ui-label">Starts</span>
              <input
                className="ui-input"
                type="datetime-local"
                value={startsAt}
                disabled={busy}
                onChange={(event) => setStartsAt(event.target.value)}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="ui-label">Location</span>
              <input
                className="ui-input"
                value={location}
                disabled={busy}
                onChange={(event) => setLocation(event.target.value)}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="ui-label">Notes</span>
              <textarea
                className="ui-input min-h-20"
                value={description}
                disabled={busy}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Add to schedule'}
            </Button>
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
