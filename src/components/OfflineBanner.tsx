import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/** Thin banner when the browser reports offline — SW still serves the shell. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  )

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) {
    return null
  }

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 border-b border-warning/30 bg-warning-soft px-3 py-2 text-center text-sm font-semibold text-warning"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      <span>You’re offline. Cached pages may still work; reconnect to sync.</span>
    </div>
  )
}
