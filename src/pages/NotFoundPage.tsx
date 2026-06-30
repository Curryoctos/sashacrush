import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'

export function NotFoundPage() {
  return (
    <AppShell title="Page not found" description="The page you requested does not exist.">
      <Link
        to="/"
        className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        Return home
      </Link>
    </AppShell>
  )
}
