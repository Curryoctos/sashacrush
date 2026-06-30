import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'

export function LoginPage() {
  return (
    <AppShell
      title="Sign in"
      description="Authentication will be powered by Supabase Auth (C-01). Magic link login for sellers, email + MFA for admin."
    >
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-muted">
          Auth integration is not yet configured. Set{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
            VITE_SUPABASE_URL
          </code>{' '}
          and{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
            VITE_SUPABASE_ANON_KEY
          </code>{' '}
          in your environment to enable sign-in.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Back to home
        </Link>
      </div>
    </AppShell>
  )
}
