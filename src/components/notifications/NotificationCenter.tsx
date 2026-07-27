import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useInAppNotifications } from '@/features/notifications/useInAppNotifications'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, isLoading, error, markRead, markAllRead } =
    useInAppNotifications()

  useEffect(() => {
    if (!open) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-ink transition hover:bg-surface"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-md bg-brand-600 px-1 py-0.5 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-surface-elevated">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Notifications</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <p className="px-4 py-6 text-center text-sm text-muted">Loading…</p>
            )}

            {error && (
              <p className="px-4 py-6 text-sm text-danger" role="alert">
                {formatSupabaseError(error as Error)}
              </p>
            )}

            {!isLoading && !error && notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted">No notifications yet.</p>
            )}

            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`border-b border-border px-4 py-3 last:border-0 ${
                  notification.read_at ? 'bg-white' : 'bg-brand-50/50'
                }`}
              >
                <p className="text-sm font-medium text-ink">{notification.title}</p>
                <p className="mt-0.5 text-xs text-muted">{notification.body}</p>
                <div className="mt-2 flex items-center gap-3">
                  {notification.href && (
                    <Link
                      to={notification.href}
                      className="text-xs font-medium text-brand-700 hover:underline"
                      onClick={() => {
                        void markRead(notification.id)
                        setOpen(false)
                      }}
                    >
                      Open
                    </Link>
                  )}
                  {!notification.read_at && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-0 py-0 text-xs"
                      onClick={() => void markRead(notification.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
