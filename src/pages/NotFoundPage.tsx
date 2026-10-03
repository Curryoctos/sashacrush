import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <AppShell centered>
      <div className="w-full max-w-sm text-center">
        <p className="text-[13px] text-muted">404</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink">
          Page not found
        </h1>
        <p className="mt-3 text-[13px] text-muted">
          That route is not part of the SashaCrush workspace.
        </p>
        <div className="mt-6 flex justify-center">
          <Link to="/">
            <Button>Return to workspace</Button>
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
