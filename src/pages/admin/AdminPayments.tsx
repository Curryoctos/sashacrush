import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, History, Scale, Wallet } from 'lucide-react'
import { BalanceTracker } from '@/features/payments/components/BalanceTracker'
import { PaymentCheckoutForm } from '@/features/payments/components/PaymentCheckoutForm'
import {
  GATEWAY_METHODS,
  isGatewayPayment,
  paymentMethodLabel,
} from '@/features/payments/paymentMethods'
import {
  PAYMENT_FOLDER_DESCRIPTIONS,
  PAYMENT_FOLDER_LABELS,
  PAYMENT_FOLDER_ORDER,
  isPaymentFolder,
} from '@/features/payments/paymentFolders'
import { useAllPayments, type PaymentWithLand } from '@/features/payments/usePayments'
import { useReceiptDownload } from '@/features/payments/useReceiptDownload'
import type { CreatePaymentInput } from '@/features/payments/validation'
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

function redirectToCheckout(checkoutUrl: string) {
  window.location.assign(checkoutUrl)
}

export function AdminPaymentsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const gatewayStatus = searchParams.get('gateway')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isCollecting, setIsCollecting] = useState(false)
  const [awaitingWebhook, setAwaitingWebhook] = useState(gatewayStatus === 'success')
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
    startGatewayCheckout,
    refresh,
  } = useAllPayments()
  const { downloadReceipt, isDownloading } = useReceiptDownload()

  const filteredPayments = selectedLandId
    ? payments.filter((payment) => payment.land_id === selectedLandId)
    : []

  const outstandingUsd = useMemo(() => {
    if (!selectedLand) {
      return null
    }
    const dealTotal = Number(selectedLand.total_value_usd)
    const allocatedUsd = filteredPayments
      .filter((payment) => payment.status !== 'failed')
      .reduce((sum, payment) => sum + Number(payment.amount_usd), 0)
    return Math.max(0, dealTotal - allocatedUsd)
  }, [selectedLand, filteredPayments])

  const awaitingCheckout = filteredPayments.filter(
    (payment) => payment.status === 'pending' && isGatewayPayment(payment.method),
  )
  const pendingManual = filteredPayments.filter(
    (payment) =>
      payment.status === 'pending' &&
      (payment.method === 'manual' || payment.method === 'crypto'),
  )
  const needsActionCount = awaitingCheckout.length + pendingManual.length

  const landReference =
    selectedLand?.title.toLowerCase().includes('mubende') ? 'SC-MBD-001' : 'SC-LAND'

  const pendingByLand = useMemo(() => {
    const map = new Map<string, number>()
    for (const payment of payments) {
      if (payment.status !== 'pending') {
        continue
      }
      map.set(payment.land_id, (map.get(payment.land_id) ?? 0) + 1)
    }
    return map
  }, [payments])

  useEffect(() => {
    if (gatewayStatus !== 'success') {
      return
    }

    setAwaitingWebhook(true)
    const interval = window.setInterval(() => {
      void refresh()
    }, 2500)

    const timeout = window.setTimeout(() => {
      setAwaitingWebhook(false)
      window.clearInterval(interval)
    }, 45_000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [gatewayStatus, refresh])

  useEffect(() => {
    if (gatewayStatus !== 'success' || !awaitingWebhook) {
      return
    }

    const recentlyConfirmed = filteredPayments.some(
      (payment) =>
        payment.status === 'confirmed' &&
        isGatewayPayment(payment.method) &&
        Date.now() - new Date(payment.created_at).getTime() < 15 * 60_000,
    )

    if (recentlyConfirmed) {
      setAwaitingWebhook(false)
      notifySuccess('Payment confirmed and receipt issued.')
      const next = new URLSearchParams(searchParams)
      next.delete('gateway')
      setSearchParams(next, { replace: true })
    }
  }, [awaitingWebhook, filteredPayments, gatewayStatus, searchParams, setSearchParams])

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

  const handleGatewayCheckout = async (paymentId: string) => {
    setActionError(null)
    setCheckoutId(paymentId)

    try {
      const checkoutUrl = await startGatewayCheckout(paymentId)
      notifySuccess('Opening secure checkout…')
      redirectToCheckout(checkoutUrl)
    } catch (checkoutError) {
      const message =
        checkoutError instanceof Error
          ? checkoutError.message
          : 'Could not start gateway checkout.'
      setActionError(message)
      notifyInfo(message)
      setCheckoutId(null)
    }
  }

  const handleCollectPayment = async (input: CreatePaymentInput) => {
    setActionError(null)
    setIsCollecting(true)

    try {
      const created = await createPayment(input)

      if (GATEWAY_METHODS.has(input.method ?? 'manual')) {
        notifySuccess('Starting secure checkout…')
        const checkoutUrl = await startGatewayCheckout(created.id)
        redirectToCheckout(checkoutUrl)
        return
      }

      notifySuccess('Payment recorded as pending. Confirm once funds clear.')
      if (selectedLandId) {
        setNavigation(selectedLandId, 'needs-action')
      }
    } catch (recordError) {
      const message =
        recordError instanceof Error ? recordError.message : 'Could not collect payment.'
      setActionError(message)
      throw recordError instanceof Error ? recordError : new Error(message)
    } finally {
      setIsCollecting(false)
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

      {gatewayStatus === 'success' && (
        <p className="rounded-md bg-success-soft px-4 py-3 text-sm text-success">
          {awaitingWebhook
            ? 'Checkout completed. Waiting for the payment provider to confirm…'
            : 'Checkout completed. Confirm manually if still pending.'}
        </p>
      )}
      {gatewayStatus === 'cancelled' && (
        <p className="rounded-md bg-warning-soft px-4 py-3 text-sm text-warning">
          Checkout was cancelled. Reopen from Needs action when ready.
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
          emptyDescription="Create a land record before collecting payments."
          prompt="Select a deal to manage payments."
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
              totalValueUsd={Number(selectedLand.total_value_usd)}
              isSubmitting={isCollecting}
              onSubmit={handleCollectPayment}
            />
          )}

          {activeFolder === 'needs-action' && (
            <Card>
              {needsActionCount === 0 ? (
                <EmptyState
                  title="Nothing needs action"
                  description="Pending checkouts and offline confirms appear here."
                />
              ) : (
                <div className="space-y-3">
                  {awaitingCheckout.map((payment) => (
                    <PendingCheckoutRow
                      key={payment.id}
                      payment={payment}
                      busy={checkoutId === payment.id}
                      confirming={confirmingId === payment.id}
                      onCheckout={() => void handleGatewayCheckout(payment.id)}
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
              <CardHeader title="Payment history" />
              {isLoading && (
                <div className="space-y-3" aria-busy="true">
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="ui-skeleton h-16" />
                  ))}
                </div>
              )}
              {!isLoading && filteredPayments.length === 0 && (
                <EmptyState title="No payments yet" description="Collect a payment to begin." />
              )}
              {filteredPayments.length > 0 && (
                <div className="space-y-3">
                  {filteredPayments.map((payment) => (
                    <PaymentHistoryRow
                      key={payment.id}
                      payment={payment}
                      checkoutId={checkoutId}
                      confirmingId={confirmingId}
                      isDownloading={isDownloading}
                      downloadingPath={downloadingPath}
                      onCheckout={() => void handleGatewayCheckout(payment.id)}
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
  checkoutId,
  confirmingId,
  isDownloading,
  downloadingPath,
  onCheckout,
  onConfirm,
  onDownload,
}: {
  payment: PaymentWithLand
  checkoutId: string | null
  confirmingId: string | null
  isDownloading: boolean
  downloadingPath: string | null
  onCheckout: () => void
  onConfirm: () => void
  onDownload: () => void
}) {
  const gateway = isGatewayPayment(payment.method)

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
            {' · '}
            {formatDate(payment.created_at)}
          </p>
        </div>
        <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {payment.status === 'pending' && gateway && (
          <Button size="sm" onClick={onCheckout} disabled={checkoutId === payment.id}>
            {checkoutId === payment.id
              ? 'Opening…'
              : payment.gateway_checkout_url
                ? 'Resume checkout'
                : 'Open checkout'}
          </Button>
        )}
        {payment.status === 'pending' && (
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
                : 'Confirm received'}
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

function PendingCheckoutRow({
  payment,
  busy,
  confirming,
  onCheckout,
  onConfirm,
}: {
  payment: PaymentWithLand
  busy: boolean
  confirming: boolean
  onCheckout: () => void
  onConfirm: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50/50 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-ink">
          Complete {paymentMethodLabel(payment.method, payment.mobile_money_network)} checkout
        </p>
        <p className="mt-0.5 text-sm text-muted">
          {formatUsd(payment.amount_usd)}
          {payment.amount_ugx != null ? ` · ${formatUgx(payment.amount_ugx)}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onCheckout} disabled={busy}>
          {busy ? 'Opening…' : payment.gateway_checkout_url ? 'Resume checkout' : 'Open checkout'}
        </Button>
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
        <p className="mt-0.5 text-sm text-muted">{formatUsd(payment.amount_usd)}</p>
      </div>
      <Button size="sm" onClick={onConfirm} disabled={confirming}>
        {confirming ? 'Confirming…' : 'Confirm received'}
      </Button>
    </div>
  )
}
