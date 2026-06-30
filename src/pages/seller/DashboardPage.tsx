import { PortalShell } from '@/components/layout/PortalShell'

const sellerNav = [
  { label: 'Land Details', to: '/seller' },
  { label: 'Receipts', to: '/seller/receipts' },
  { label: 'Chat', to: '/seller/chat' },
]

export function SellerDashboardPage() {
  return (
    <PortalShell portal="Seller Portal" navItems={sellerNav}>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Mubende Land Record</h2>
        <p className="mt-2 text-sm text-muted">
          Restricted seller view — land details, chat with admin, camera upload, and receipt
          downloads only. No payment method or balance data is exposed.
        </p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Property
            </dt>
            <dd className="mt-1 font-medium text-ink">SC-MBD-001 · Mubende, Uganda</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Total Value
            </dt>
            <dd className="mt-1 font-medium text-ink">$300,000 USD</dd>
          </div>
        </dl>
      </div>
    </PortalShell>
  )
}
