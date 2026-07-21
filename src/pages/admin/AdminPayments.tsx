import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { computeDealBalance } from '@/features/payments/balance'
import { useAllPayments } from '@/features/payments/usePayments'
import { notifyInfo, notifySuccess } from '@/features/notifications/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { formatUsd } from '@/lib/land-records'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types'
import type { PaymentMethod } from '@/types/database'

const PAYMENT_METHODS: PaymentMethod[] = ['manual', 'stripe', 'flutterwave', 'crypto']

const LAND_COLUMNS = 'id, title, total_value_usd'

function statusBadge(status: string): string {
  if (status === 'confirmed') {
    return 'bg-green-100 text-green-800'
  }

  if (status === 'pending') {
    return 'bg-amber-100 text-amber-800'
  }

  return 'bg-slate-100 text-slate-700'
}

export function AdminPaymentsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const landFromQuery = searchParams.get('land')
  const [selectedLandId, setSelectedLandId] = useState<string>('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [amountUsd, setAmountUsd] = useState('')
  const [amountUgx, setAmountUgx] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('manual')
  const [isRecording, setIsRecording] = useState(false)

  const landsQuery = useQuery({
    queryKey: ['land-records', 'admin-payments'],
    queryFn: async (): Promise<LandRecord[]> => {
      const { data, error } = await supabase
        .from('land_records')
        .select(LAND_COLUMNS)
        .eq('status', 'active')
        .order('title')

      if (error) {
        throw error
      }

      return (data ?? []) as LandRecord[]
    },
  })

  useEffect(() => {
    if (!landFromQuery || !landsQuery.data?.length) {
      return
    }

    if (landsQuery.data.some((land) => land.id === landFromQuery)) {
      setSelectedLandId(landFromQuery)
    }
  }, [landFromQuery, landsQuery.data])

  const activeLandId = selectedLandId || landsQuery.data?.[0]?.id || ''
  const { payments, isLoading, error, confirmPayment, createPayment } = useAllPayments()

  const activeLand = (landsQuery.data ?? []).find((land) => land.id === activeLandId)
  const filteredPayments = activeLandId
    ? payments.filter((payment) => payment.land_id === activeLandId)
    : payments

  const balance = activeLand
    ? computeDealBalance(Number(activeLand.total_value_usd), filteredPayments)
    : null

  const handleConfirm = async (paymentId: string) => {
    setActionError(null)
    setConfirmingId(paymentId)

    try {
      const receiptNumber = await confirmPayment(paymentId)
      notifySuccess(`Payment confirmed. Receipt ${receiptNumber} created.`)
    } catch (confirmError) {
      const message =
        confirmError instanceof Error
          ? confirmError.message
          : 'Could not confirm payment.'
      setActionError(message)
      notifyInfo(message)
    } finally {
      setConfirmingId(null)
    }
  }

  const handleRecordPayment = async (event: FormEvent) => {
    event.preventDefault()
    if (!activeLandId) {
      setActionError('Select a land record first.')
      return
    }

    setActionError(null)
    setIsRecording(true)

    try {
      await createPayment({
        landId: activeLandId,
        amountUsd: Number(amountUsd),
        amountUgx: amountUgx.trim() ? Number(amountUgx) : null,
        method,
      })
      setAmountUsd('')
      setAmountUgx('')
      notifySuccess('Payment recorded as pending.')
    } catch (recordError) {
      const message =
        recordError instanceof Error ? recordError.message : 'Could not record payment.'
      setActionError(message)
    } finally {
      setIsRecording(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-ink">Payments</h1>
              <p className="mt-1 text-sm text-muted">Signed in as {user?.email}</p>
            </div>
            <Link
              to="/admin/dashboard"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Back to dashboard
            </Link>
          </div>

          <div className="mt-6">
            <label htmlFor="land-select" className="block text-sm font-medium text-ink">
              Filter by land record
            </label>
            <select
              id="land-select"
              value={activeLandId}
              onChange={(event) => setSelectedLandId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {(landsQuery.data ?? []).map((land) => (
                <option key={land.id} value={land.id}>
                  {land.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {balance && (
          <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Balance tracker</h2>
            <p className="mt-1 text-sm text-muted">
              Paid vs outstanding for {activeLand?.title ?? 'this property'}.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <BalanceStat label="Deal total" value={formatUsd(balance.totalValueUsd)} />
              <BalanceStat label="Paid (confirmed)" value={formatUsd(balance.paidUsd)} />
              <BalanceStat label="Pending (unconfirmed)" value={formatUsd(balance.pendingUsd)} />
              <BalanceStat label="Outstanding" value={formatUsd(balance.outstandingUsd)} />
            </div>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Record payment</h2>
          <p className="mt-1 text-sm text-muted">
            Log an incoming payment as pending, then confirm it to issue a receipt.
          </p>

          <form onSubmit={handleRecordPayment} className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="amount-usd" className="block text-sm font-medium text-ink">
                Amount (USD)
              </label>
              <input
                id="amount-usd"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amountUsd}
                onChange={(event) => setAmountUsd(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="amount-ugx" className="block text-sm font-medium text-ink">
                Amount (UGX, optional)
              </label>
              <input
                id="amount-ugx"
                type="number"
                min="1"
                step="1"
                value={amountUgx}
                onChange={(event) => setAmountUgx(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="payment-method" className="block text-sm font-medium text-ink">
                Method
              </label>
              <select
                id="payment-method"
                value={method}
                onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {PAYMENT_METHODS.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isRecording || !activeLandId}
                className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {isRecording ? 'Recording…' : 'Record payment'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Payment records</h2>
          <p className="mt-1 text-sm text-muted">
            Confirm a payment to issue a server-side seller receipt and trigger email notifications.
          </p>

          {isLoading && <p className="mt-6 text-sm text-muted">Loading payments…</p>}

          {(error || actionError) && (
            <p className="mt-6 text-sm text-red-700" role="alert">
              {actionError ??
                (error instanceof Error ? formatSupabaseError(error) : 'Could not load payments.')}
            </p>
          )}

          {!isLoading && !error && filteredPayments.length === 0 && (
            <p className="mt-6 rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-muted">
              No payments for this property yet.
            </p>
          )}

          {filteredPayments.length > 0 && (
            <div className="mt-6 space-y-3">
              {filteredPayments.map((payment) => (
                <article
                  key={payment.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{payment.land_title}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {formatUsd(payment.amount_usd)}
                        {payment.amount_ugx != null &&
                          ` · UGX ${payment.amount_ugx.toLocaleString()}`}
                        {payment.method && ` · ${payment.method}`}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Recorded {new Date(payment.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(payment.status)}`}
                    >
                      {payment.status}
                    </span>
                  </div>

                  {payment.status !== 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => void handleConfirm(payment.id)}
                      disabled={confirmingId === payment.id}
                      className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {confirmingId === payment.id ? 'Confirming…' : 'Confirm payment'}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function BalanceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium uppercase text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  )
}
