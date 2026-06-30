import { AppShell } from '@/components/layout/AppShell'

export function CommunityPage() {
  return (
    <AppShell
      title="Pipeline Community"
      description="Community board for incubation visitors, collaborators, and project members."
    >
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-muted">
          Community features (C-23) will live in a separate routing namespace from the land
          deal portal.
        </p>
      </div>
    </AppShell>
  )
}
