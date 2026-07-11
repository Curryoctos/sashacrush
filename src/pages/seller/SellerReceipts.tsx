import { downloadReceiptPdf, useReceipts } from '@/features/payments/useReceipts'
import { useAuth } from '@/hooks/useAuth'
import { formatUsd } from '@/lib/land-records'
import { formatSupabaseError } from '@/lib/supabase-errors'

export function SellerReceiptsPage() {
  const { user } = useAuth()
  const { data: receipts, isLoading, error } = useReceipts()

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-ink">Receipts</h1>
          <p className="mt-1 text-sm text-muted">Signed in as {user?.email}</p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Your payment receipts</h2>
          <p className="mt-1 text-sm text-muted">
            Receipts are issued after admin confirms your payment. Download the PDF for your
            records.
          </p>

          {isLoading && <p className="mt-6 text-sm text-muted">Loading receipts…</p>}

          {error && (
            <p className="mt-6 text-sm text-red-700" role="alert">
              {formatSupabaseError(error as Error)}
            </p>
          )}

          {!isLoading && !error && receipts?.length === 0 && (
            <p className="mt-6 rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-muted">
              No receipts yet. They will appear here once your payment is confirmed.
            </p>
          )}

          {receipts && receipts.length > 0 && (
            <div className="mt-6 space-y-3">
              {receipts.map((receipt) => (
                <article
                  key={receipt.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{receipt.receipt_number}</h3>
                      <p className="mt-1 text-sm text-muted">{receipt.land_title}</p>
                      <p className="mt-1 text-sm text-ink">{formatUsd(receipt.amount_usd)}</p>
                      <p className="mt-1 text-xs text-muted">
                        Issued {new Date(receipt.created_at).toLocaleString()}
                      </p>
                    </div>
                    {receipt.pdf_path && (
                      <button
                        type="button"
                        onClick={() => void downloadReceiptPdf(receipt.pdf_path!)}
                        className="rounded-lg border border-brand-600 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
                      >
                        Download PDF
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
