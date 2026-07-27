import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function NotFoundPage() {
  return (
    <AppShell centered>
      <Card padding="lg" className="w-full max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-muted">
          That route is not part of the SashaCrush workspace.
        </p>
        <div className="mt-6 flex justify-center">
          <Link to="/">
            <Button>Return to workspace</Button>
          </Link>
        </div>
      </Card>
    </AppShell>
  )
}
