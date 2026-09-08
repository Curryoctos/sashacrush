import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, History, Scale, Wallet } from 'lucide-react'
import { BalanceTracker } from '@/features/payments/components/BalanceTracker'
import { PaymentCheckoutForm } from '@/features/payments/components/PaymentCheckoutForm'
import { computeDealBalance } from '@/features/payments/balance'
import {
  GATEWAY_PAYOUT_METHODS,
  isAwaitingManualConfirm,
  isConfirmablePending,
  isGatewayPayment,
  paymentMethodLabel,
} from '@/features/payments/paymentMethods'
import { landReferenceFromId } from '@/lib/landReference'
import {
  PAYMENT_FOLDER_DESCRIPTIONS,
  PAYMENT_FOLDER_LABELS,
  PAYMENT_FOLDER_ORDER,
  isPaymentFolder,
} from '@/features/payments/paymentFolders'
import { useAllPayments, type PaymentWithLand } from '@/features/payments/usePayments'
import { useReceiptDownload } from '@/features/payments/useReceiptDownload'
import type { CreatePaymentInput } from '@/features/payments/validation'
import { useCompanyCapital } from '@/features/investments/useInvestments'
import { notifyInfo, notifySuccess } from '@/features/notifications/useNotifications'
import {
  DealCards,
  FolderCards,
  HierarchyNav,
} from '@/components/hierarchy/Hierarchy'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, PageHeader } from '@/components/ui/PageHeader'
import { useLandHierarchyNav } from '@/hooks/useLandHierarchyNav'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatUgx, formatUsd } from '@/lib/formatters'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types'

const LAND_COLUMNS = 'id, title, total_value_usd'

export function AdminPaymentsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const gatewayStatus = searchParams.get('gateway')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [payoutId, setPayoutId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPayingOut, setIsPayingOut] = useState(false)
  const [awaitingPaymentId, setAwaitingPaymentId] = useState<string | null>(null)
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null)

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

  const lands = landsQuery.data ?? []
  const { selectedLandId, selectedLand, selectedFolder, setNavigation } =
    useLandHierarchyNav(lands)
  const activeFolder = isPaymentFolder(selectedFolder) ? selectedFolder : null

  const {
    payments,
    isLoading,
    error,
    confirmPayment,
    createPayment,
    startGatewayPayout,
    refresh,
  } = useAllPayments()
  const { capital } = useCompanyCapital()
  const { downloadReceipt, isDownloading } = useReceiptDownload()

  const filteredPayments = selectedLandId
    ? payments.filter((payment) => payment.land_id === selectedLandId)
    : []

  const dealBalance = useMemo(() => {
    if (!selectedLand) {
      return null
    }
    return computeDealBalance(Number(selectedLand.total_value_usd), filteredPayments)
  }, [selectedLand, filteredPayments])

  const outstandingUsd = dealBalance?.outstandingUsd ?? null
  const availableToPayOutUsd = dealBalance?.availableToPayOutUsd ?? null

  const awaitingPayout = filteredPayments.filter(
    (payment) => payment.status === 'pending' && isGatewayPayment(payment.method),
  )
  const pendingManual = filteredPayments.filter((payment) =>
    isAwaitingManualConfirm(payment.status, payment.method),
  )
  const needsActionCount = awaitingPayout.length + pendingManual.length

  const landReference = selectedLandId
    ? landReferenceFromId(selectedLandId)
    : 'SC-LAND'

  const pendingByLand = useMemo(() => {
    const map = new Map<string, number>()
    for (const payment of payments) {
      if (payment.status !== 'pending' && payment.status !== 'pending_manual') {
        continue
      }
      map.set(payment.land_id, (map.get(payment.land_id) ?? 0) + 1)
    }
    return map
  }, [payments])

  useEffect(() => {
    if (!awaitingPaymentId) {
      return
    }

    const interval = window.setInterval(() => {
      void refresh()
    }, 2500)

    const timeout = window.setTimeout(() => {
      setAwaitingPaymentId(null)
      window.clearInterval(interval)
    }, 45_000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [awaitingPaymentId, refresh])

  useEffect(() => {
    if (!awaitingPaymentId) {
      return
    }

    const tracked = filteredPayments.find((payment) => payment.id === awaitingPaymentId)
    if (!tracked) {
      return
    }

    if (tracked.status === 'confirmed') {
      setAwaitingPaymentId(null)
      notifySuccess('Payout confirmed and seller receipt issued.')
      return
    }

    if (tracked.status === 'failed') {
      setAwaitingPaymentId(null)
      notifyInfo('MoMo payout failed at Flutterwave. Create a new payout to retry.')
    }
  }, [awaitingPaymentId, filteredPayments])

  useEffect(() => {
    if (!gatewayStatus) {
      return
    }
    const next = new URLSearchParams(searchParams)
    next.delete('gateway')
    setSearchParams(next, { replace: true })
  }, [gatewayStatus, searchParams, setSearchParams])

  const handleConfirm = async (paymentId: string) => {
    setActionError(null)
    setConfirmingId(paymentId)

    try {
      const receiptNumber = await confirmPayment(paymentId)
      notifySuccess(`Payout confirmed. Receipt ${receiptNumber} created.`)
    } catch (confirmError) {
      const message =
        confirmError instanceof Error
          ? confirmError.message
          : 'Could not confirm payout.'
      setActionError(message)
      notifyInfo(message)
    } finally {
      setConfirmingId(null)
    }
  }

  const handleGatewayPayout = async (paymentId: string) => {
    setActionError(null)
    setPayoutId(paymentId)

    try {
      const result = await startGatewayPayout(paymentId)
      notifySuccess(
        result.reused
          ? 'Payout already submitted. Waiting for Flutterwave…'
          : 'MoMo payout submitted. Waiting for Flutterwave to confirm…',
      )
      setAwaitingPaymentId(paymentId)
      if (selectedLandId) {
        setNavigation(selectedLandId, 'needs-action')
      }
    } catch (payoutError) {
      const message =
        payoutError instanceof Error ? payoutError.message : 'Could not start seller payout.'
      setActionError(message)
      notifyInfo(message)
    } finally {
      setPayoutId(null)
    }
  }

  const handlePayOut = async (input: CreatePaymentInput) => {
    setActionError(null)
    setIsPayingOut(true)

    try {
      const created = await createPayment(input)

      if (GATEWAY_PAYOUT_METHODS.has(input.method ?? 'manual')) {
        notifySuccess('Submitting MoMo payout…')
        await startGatewayPayout(created.id)
        setAwaitingPaymentId(created.id)
        if (selectedLandId) {
          setNavigation(selectedLandId, 'needs-action')
        }
        notifySuccess('Payout queued. Waiting for Flutterwave to confirm…')
        return
      }

      notifySuccess('Manual payout recorded. Confirm once the seller is paid.')
      if (selectedLandId) {
        setNavigation(selectedLandId, 'needs-action')
      }
    } catch (recordError) {
      const message =
        recordError instanceof Error ? recordError.message : 'Could not create payout.'
      setActionError(message)
      throw recordError instanceof Error ? recordError : new Error(message)
    } finally {
      setIsPayingOut(false)
    }
  }

  return (
    <div className="ui-page max-w-4xl">
      <PageHeader
        eyebrow="Treasury"
        title="Payments"
        description={
          user?.email
            ? `Signed in as ${user.email}. Open a deal, then a folder.`
            : 'Open a deal, then a folder.'
        }
        actions={
          <Link to="/admin/dashboard">
            <Button variant="secondary">Dashboard</Button>
          </Link>
        }
      />

      {awaitingPaymentId && (
        <p className="rounded-md bg-success-soft px-4 py-3 text-sm text-success">
          MoMo payout submitted. Waiting for Flutterwave to confirm…
        </p>
      )}

      {landsQuery.isLoading && <p className="text-sm text-muted">Loading deals…</p>}

      {landsQuery.error && (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(landsQuery.error as Error)}
        </p>
      )}

      {!landsQuery.isLoading && !selectedLand && (
        <DealCards
          deals={lands.map((land) => {
            const pending = pendingByLand.get(land.id) ?? 0
            return {
              id: land.id,
              title: land.title,
              hint: pending > 0 ? `${pending} need action` : 'Open folders',
            }
          })}
          onSelect={(id) => setNavigation(id, null)}
          emptyTitle="No active deals"
          emptyDescription="Create a land record before paying out sellers."
          prompt="Select a deal to manage payouts."
        />
      )}

      {selectedLand && !activeFolder && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              { label: 'All deals', onClick: () => setNavigation(null, null) },
              { label: selectedLand.title },
            ]}
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="ui-section-title">{selectedLand.title}</h2>
              <p className="ui-section-desc">Choose a payments folder</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setNavigation(null, null)}>
              <ArrowLeft className="h-4 w-4" />
              All deals
            </Button>
          </div>
          <FolderCards
            folders={PAYMENT_FOLDER_ORDER.map((folder) => ({
              id: folder,
              title: PAYMENT_FOLDER_LABELS[folder],
              description: PAYMENT_FOLDER_DESCRIPTIONS[folder],
              icon:
                folder === 'balance' ? (
                  <Scale className="h-5 w-5" />
                ) : folder === 'collect' ? (
                  <Wallet className="h-5 w-5" />
                ) : folder === 'needs-action' ? (
                  <ClipboardList className="h-5 w-5" />
                ) : (
                  <History className="h-5 w-5" />
                ),
              count:
                folder === 'needs-action'
                  ? needsActionCount
                  : folder === 'history'
                    ? filteredPayments.length
                    : undefined,
              onSelect: () => setNavigation(selectedLand.id, folder),
            }))}
          />
        </div>
      )}

      {selectedLand && activeFolder && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              { label: 'All deals', onClick: () => setNavigation(null, null) },
              {
                label: selectedLand.title,
                onClick: () => setNavigation(selectedLand.id, null),
              },
              { label: PAYMENT_FOLDER_LABELS[activeFolder] },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="ui-section-title">{PAYMENT_FOLDER_LABELS[activeFolder]}</h2>
              <p className="ui-section-desc">{PAYMENT_FOLDER_DESCRIPTIONS[activeFolder]}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setNavigation(selectedLand.id, null)}
            >
              <ArrowLeft className="h-4 w-4" />
              Folders
            </Button>
          </div>

          {(error || actionError) && (
            <p className="ui-alert-danger" role="alert">
              {actionError ??
                (error instanceof Error ? formatSupabaseError(error) : 'Could not load payments.')}
            </p>
          )}

          {activeFolder === 'balance' && (
            <BalanceTracker
              landId={selectedLand.id}
              landTitle={selectedLand.title}
              landReference={landReference}
              totalValueUsd={Number(selectedLand.total_value_usd)}
            />
          )}

          {activeFolder === 'collect' && (
            <PaymentCheckoutForm
              landId={selectedLand.id}
              landTitle={selectedLand.title}
              outstandingUsd={outstandingUsd}
              availableToPayOutUsd={availableToPayOutUsd}
              totalValueUsd={Number(selectedLand.total_value_usd)}
              companyCapitalAvailableUsd={capital?.availableUsd ?? null}
              isSubmitting={isPayingOut}
              onSubmit={handlePayOut}
            />
          )}

          {activeFolder === 'needs-action' && (
            <Card>
              {needsActionCount === 0 ? (
                <EmptyState
                  title="Nothing needs action"
                  description="Queued MoMo payouts and offline confirms appear here."
                />
              ) : (
                <div className="space-y-3">
                  {awaitingPayout.map((payment) => (
                    <PendingPayoutRow
                      key={payment.id}
                      payment={payment}
                      busy={payoutId === payment.id}
                      confirming={confirmingId === payment.id}
                      onRetryPayout={() => void handleGatewayPayout(payment.id)}
                      onConfirm={() => void handleConfirm(payment.id)}
                    />
                  ))}
                  {pendingManual.map((payment) => (
                    <PendingManualRow
                      key={payment.id}
                      payment={payment}
                      confirming={confirmingId === payment.id}
                      onConfirm={() => void handleConfirm(payment.id)}
                    />
                  ))}
                </div>
              )}
            </Card>
          )}

          {activeFolder === 'history' && (
            <Card>
              <CardHeader title="Payout history" />
              {isLoading && (
                <div className="space-y-3" aria-busy="true">
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="ui-skeleton h-16" />
                  ))}
                </div>
              )}
              {!isLoading && filteredPayments.length === 0 && (
                <EmptyState title="No payouts yet" description="Pay out to a seller to begin." />
              )}
              {filteredPayments.length > 0 && (
                <div className="space-y-3">
                  {filteredPayments.map((payment) => (
                    <PaymentHistoryRow
                      key={payment.id}
                      payment={payment}
                      payoutId={payoutId}
                      confirmingId={confirmingId}
                      isDownloading={isDownloading}
                      downloadingPath={downloadingPath}
                      onRetryPayout={() => void handleGatewayPayout(payment.id)}
                      onConfirm={() => void handleConfirm(payment.id)}
                      onDownload={() => {
                        if (!payment.pdf_path) {
                          return
                        }
                        setDownloadingPath(payment.pdf_path)
                        void downloadReceipt(payment.pdf_path).finally(() =>
                          setDownloadingPath(null),
                        )
                      }}
                    />
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function PaymentHistoryRow({
  payment,
  payoutId,
  confirmingId,
  isDownloading,
  downloadingPath,
  onRetryPayout,
  onConfirm,
  onDownload,
}: {
  payment: PaymentWithLand
  payoutId: string | null
  confirmingId: string | null
  isDownloading: boolean
  downloadingPath: string | null
  onRetryPayout: () => void
  onConfirm: () => void
  onDownload: () => void
}) {
  const gateway = isGatewayPayment(payment.method)
  const payoutSubmitted = Boolean(payment.flutterwave_tx_ref)

  return (
    <article className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">
            {payment.receipt_number ?? 'Pending receipt'}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {formatUsd(payment.amount_usd)}
            {payment.amount_ugx != null ? ` · ${formatUgx(payment.amount_ugx)}` : ''}
            {' · '}
            {paymentMethodLabel(payment.method, payment.mobile_money_network)}
            {payment.manual_reference ? ` · ${payment.manual_reference}` : ''}
            {payment.payer_phone ? ` · ${payment.payer_phone}` : ''}
            {' · '}
            {formatDate(payment.created_at)}
          </p>
        </div>
        <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {payment.status === 'pending' && gateway && !payoutSubmitted && (
          <Button size="sm" onClick={onRetryPayout} disabled={payoutId === payment.id}>
            {payoutId === payment.id ? 'Sending…' : 'Submit payout'}
          </Button>
        )}
        {isConfirmablePending(payment.status) && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onConfirm}
            disabled={confirmingId === payment.id}
          >
            {confirmingId === payment.id
              ? 'Confirming…'
              : gateway
                ? 'Confirm manually'
                : 'Confirm paid'}
          </Button>
        )}
        {payment.status === 'confirmed' && payment.pdf_path ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={isDownloading && downloadingPath === payment.pdf_path}
            onClick={onDownload}
          >
            ↓ Receipt
          </Button>
        ) : null}
      </div>
    </article>
  )
}

function PendingPayoutRow({
  payment,
  busy,
  confirming,
  onRetryPayout,
  onConfirm,
}: {
  payment: PaymentWithLand
  busy: boolean
  confirming: boolean
  onRetryPayout: () => void
  onConfirm: () => void
}) {
  const submitted = Boolean(payment.flutterwave_tx_ref)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50/50 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-ink">
          {submitted
            ? `${paymentMethodLabel(payment.method, payment.mobile_money_network)} queued`
            : `Submit ${paymentMethodLabel(payment.method, payment.mobile_money_network)}`}
        </p>
        <p className="mt-0.5 text-sm text-muted">
          {formatUsd(payment.amount_usd)}
          {payment.amount_ugx != null ? ` · ${formatUgx(payment.amount_ugx)}` : ''}
          {payment.payer_phone ? ` · ${payment.payer_phone}` : ''}
          {submitted && payment.flutterwave_tx_ref ? (
            <span className="ml-2 font-mono text-xs text-ink">{payment.flutterwave_tx_ref}</span>
          ) : null}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {!submitted && (
          <Button size="sm" onClick={onRetryPayout} disabled={busy}>
            {busy ? 'Sending…' : 'Submit payout'}
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onConfirm} disabled={confirming}>
          {confirming ? 'Confirming…' : 'Confirm manually'}
        </Button>
      </div>
    </div>
  )
}

function PendingManualRow({
  payment,
  confirming,
  onConfirm,
}: {
  payment: PaymentWithLand
  confirming: boolean
  onConfirm: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-ink">
          Confirm {paymentMethodLabel(payment.method, payment.mobile_money_network)}
        </p>
        <p className="mt-0.5 text-sm text-muted">
          {formatUsd(payment.amount_usd)}
          {payment.manual_reference ? (
            <span className="ml-2 font-mono text-xs text-ink">{payment.manual_reference}</span>
          ) : null}
          {payment.payer_phone ? (
            <span className="ml-2 text-xs">{payment.payer_phone}</span>
          ) : null}
        </p>
      </div>
      <Button size="sm" onClick={onConfirm} disabled={confirming}>
        {confirming ? 'Confirming…' : 'Confirm paid'}
      </Button>
    </div>
  )
}
