import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ClipboardList, History, Scale, Wallet } from 'lucide-react'
import {
  DealCards,
  FolderCards,
  HierarchyNav,
} from '@/components/hierarchy/Hierarchy'
import { BackArrow } from '@/components/ui/BackArrow'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, PageHeader } from '@/components/ui/PageHeader'
import { BalanceTracker } from '@/features/payments/components/BalanceTracker'
import { PaymentCheckoutForm } from '@/features/payments/components/PaymentCheckoutForm'
import { LinkedLandCard } from '@/features/projects/components/LandProjectBridge'
import { ensureLandFundingProject } from '@/features/projects/projectLandLink'
import { computeDealBalance } from '@/features/payments/balance'
import {
  GATEWAY_PAYOUT_METHODS,
  isAwaitingManualConfirm,
  isConfirmablePending,
  isGatewayPayment,
  paymentMethodLabel,
} from '@/features/payments/paymentMethods'
import {
  PAYMENT_FOLDER_ORDER,
  PROJECT_PURCHASE_FOLDER_DESCRIPTIONS,
  PROJECT_PURCHASE_FOLDER_LABELS,
  isPaymentFolder,
} from '@/features/payments/paymentFolders'
import {
  useProjectPayments,
  type PaymentWithLand,
} from '@/features/payments/usePayments'
import { useReceiptDownload } from '@/features/payments/useReceiptDownload'
import type { CreatePaymentInput } from '@/features/payments/validation'
import { useCompanyCapital } from '@/features/investments/useInvestments'
import {
  notifyInfo,
  notifySuccess,
} from '@/features/notifications/useNotifications'
import { useProjectHierarchyNav } from '@/hooks/useProjectHierarchyNav'
import { projectReferenceFromId } from '@/lib/landReference'
import { formatDate, formatUgx, formatUsd } from '@/lib/formatters'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { supabase } from '@/lib/supabase'
import type { Project } from '@/types/projects'

/**
 * Unified purchases / disbursements — every outbound payment targets a project
 * and records a disbursement reason. Create → pending → clear under Needs action.
 */
export function AdminProjectPurchasesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const gatewayStatus = searchParams.get('gateway')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [payoutId, setPayoutId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPayingOut, setIsPayingOut] = useState(false)
  const [awaitingPaymentId, setAwaitingPaymentId] = useState<string | null>(
    null,
  )
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null)

  const projectsQuery = useQuery({
    queryKey: ['projects', 'admin-purchases'],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select(
          'id, title, slug, description, cause, type, created_by, owner_id, visibility, funding_goal_usd, funding_raised_usd, min_contribution_usd, location_name, country, latitude, longitude, boundary_geojson, start_date, target_date, completed_date, status, cover_image_path, tags, external_links, land_id, created_at, updated_at',
        )
        .neq('status', 'cancelled')
        .order('title')

      if (error) throw error
      return (data ?? []) as Project[]
    },
  })

  const projects = projectsQuery.data ?? []
  const {
    selectedProjectId,
    selectedProject,
    selectedFolder,
    setNavigation,
  } = useProjectHierarchyNav(projects)
  const activeFolder = isPaymentFolder(selectedFolder) ? selectedFolder : null
  const landFromQuery = searchParams.get('land')

  // Resolve ?land= into the linked project so land-workspace Purchases stay in context.
  useEffect(() => {
    if (!landFromQuery || selectedProjectId || projectsQuery.isLoading) return

    const linked = projects.find((project) => project.land_id === landFromQuery)
    if (linked) {
      setNavigation(linked.id, activeFolder ?? 'collect')
      return
    }

    let cancelled = false
    void (async () => {
      const { data: land, error } = await supabase
        .from('land_records')
        .select(
          'id, title, description, location, total_value_usd, latitude, longitude, boundary_geojson, status',
        )
        .eq('id', landFromQuery)
        .maybeSingle()
      if (cancelled || error || !land) return

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const project = await ensureLandFundingProject(supabase, land, user.id)
      if (cancelled) return
      await projectsQuery.refetch()
      setNavigation(project.id, activeFolder ?? 'collect')
    })()

    return () => {
      cancelled = true
    }
  }, [
    landFromQuery,
    selectedProjectId,
    projects,
    projectsQuery,
    activeFolder,
    setNavigation,
  ])

  const linkedLandQuery = useQuery({
    queryKey: ['land-record', selectedProject?.land_id],
    enabled: Boolean(selectedProject?.land_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('land_records')
        .select('id, title')
        .eq('id', selectedProject!.land_id!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const {
    payments,
    isLoading,
    error,
    confirmPayment,
    createPayment,
    startGatewayPayout,
    refresh,
  } = useProjectPayments(selectedProjectId)
  const { capital } = useCompanyCapital()
  const { downloadReceipt, isDownloading } = useReceiptDownload()

  const filteredPayments = selectedProjectId
    ? payments.filter((payment) => payment.project_id === selectedProjectId)
    : []

  const dealBalance = useMemo(() => {
    if (!selectedProject) return null
    return computeDealBalance(
      Number(selectedProject.funding_goal_usd ?? 0),
      filteredPayments,
    )
  }, [selectedProject, filteredPayments])

  const outstandingUsd = dealBalance?.outstandingUsd ?? null
  const availableToPayOutUsd = dealBalance?.availableToPayOutUsd ?? null

  const awaitingPayout = filteredPayments.filter(
    (payment) =>
      payment.status === 'pending' && isGatewayPayment(payment.method),
  )
  const pendingManual = filteredPayments.filter((payment) =>
    isAwaitingManualConfirm(payment.status, payment.method),
  )
  const needsActionCount = awaitingPayout.length + pendingManual.length

  const projectReference = selectedProjectId
    ? projectReferenceFromId(selectedProjectId)
    : 'SC-P'

  const pendingByProject = useMemo(() => {
    const map = new Map<string, number>()
    for (const payment of payments) {
      if (payment.status !== 'pending' && payment.status !== 'pending_manual') {
        continue
      }
      if (!payment.project_id) continue
      map.set(payment.project_id, (map.get(payment.project_id) ?? 0) + 1)
    }
    return map
  }, [payments])

  useEffect(() => {
    if (!awaitingPaymentId) return
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
    if (!awaitingPaymentId) return
    const tracked = filteredPayments.find((p) => p.id === awaitingPaymentId)
    if (!tracked) return
    if (tracked.status === 'confirmed') {
      setAwaitingPaymentId(null)
      notifySuccess('Purchase confirmed and receipt issued.')
    }
    if (tracked.status === 'failed') {
      setAwaitingPaymentId(null)
      notifyInfo('MoMo purchase failed. Create a new purchase to retry.')
    }
  }, [awaitingPaymentId, filteredPayments])

  useEffect(() => {
    if (!gatewayStatus) return
    const next = new URLSearchParams(searchParams)
    next.delete('gateway')
    setSearchParams(next, { replace: true })
  }, [gatewayStatus, searchParams, setSearchParams])

  const handleConfirm = async (paymentId: string) => {
    setActionError(null)
    setConfirmingId(paymentId)
    try {
      const receiptNumber = await confirmPayment(paymentId)
      notifySuccess(`Purchase confirmed. Receipt ${receiptNumber} created.`)
    } catch (confirmError) {
      const message =
        confirmError instanceof Error
          ? confirmError.message
          : 'Could not confirm purchase.'
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
          : 'MoMo purchase submitted. Waiting for Flutterwave…',
      )
      setAwaitingPaymentId(paymentId)
      if (selectedProjectId) {
        setNavigation(selectedProjectId, 'needs-action')
      }
    } catch (payoutError) {
      const message =
        payoutError instanceof Error
          ? payoutError.message
          : 'Could not start purchase payout.'
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
        notifySuccess('Submitting MoMo purchase…')
        await startGatewayPayout(created.id)
        setAwaitingPaymentId(created.id)
        if (selectedProjectId) {
          setNavigation(selectedProjectId, 'needs-action')
        }
        notifySuccess('Purchase queued. Waiting for Flutterwave…')
        return
      }
      notifySuccess('Manual purchase recorded. Confirm once the payee is paid.')
      if (selectedProjectId) {
        setNavigation(selectedProjectId, 'needs-action')
      }
    } catch (recordError) {
      const message =
        recordError instanceof Error
          ? recordError.message
          : 'Could not create purchase.'
      setActionError(message)
      throw recordError instanceof Error ? recordError : new Error(message)
    } finally {
      setIsPayingOut(false)
    }
  }

  return (
    <div className="ui-page">
      <PageHeader
        backTo="/admin/finance"
        backLabel="Finance"
        title="Purchases"
        description="Every outbound payment targets a project. When the project is linked to a land deal, that land context is kept on the purchase."
      />

      {awaitingPaymentId && (
        <p className="ui-alert-success">
          MoMo purchase submitted. Waiting for Flutterwave to confirm…
        </p>
      )}

      {projectsQuery.isLoading && (
        <p className="text-[13px] text-muted">Loading projects…</p>
      )}

      {projectsQuery.error && (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(projectsQuery.error as Error)}
        </p>
      )}

      {!projectsQuery.isLoading && !selectedProject && (
        <DealCards
          deals={projects.map((project) => {
            const pending = pendingByProject.get(project.id) ?? 0
            return {
              id: project.id,
              title: project.title,
              hint:
                pending > 0
                  ? `${pending} need action`
                  : project.cause
                    ? project.cause.slice(0, 48)
                    : 'Open purchase folders',
            }
          })}
          onSelect={(id) => setNavigation(id, null)}
          emptyTitle="No projects yet"
          emptyDescription="Create a funding project before recording purchases."
          prompt="Select a project to manage purchases."
        />
      )}

      {selectedProject && !activeFolder && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              { label: 'All projects', onClick: () => setNavigation(null, null) },
              { label: selectedProject.title },
            ]}
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="ui-section-title">{selectedProject.title}</h2>
              <p className="ui-section-desc">
                Choose a purchases folder
                {selectedProject.cause
                  ? ` · ${selectedProject.cause}`
                  : ''}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setNavigation(null, null)}
            >
              <BackArrow />
              All projects
            </Button>
          </div>
          {selectedProject.land_id && linkedLandQuery.data ? (
            <LinkedLandCard
              landId={selectedProject.land_id}
              landTitle={linkedLandQuery.data.title}
            />
          ) : null}
          <FolderCards
            folders={PAYMENT_FOLDER_ORDER.map((folder) => ({
              id: folder,
              title: PROJECT_PURCHASE_FOLDER_LABELS[folder],
              description: PROJECT_PURCHASE_FOLDER_DESCRIPTIONS[folder],
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
              onSelect: () => setNavigation(selectedProject.id, folder),
            }))}
          />
        </div>
      )}

      {selectedProject && activeFolder && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              {
                label: 'All projects',
                onClick: () => setNavigation(null, null),
              },
              {
                label: selectedProject.title,
                onClick: () => setNavigation(selectedProject.id, null),
              },
              { label: PROJECT_PURCHASE_FOLDER_LABELS[activeFolder] },
            ]}
          />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="ui-section-title">
                {PROJECT_PURCHASE_FOLDER_LABELS[activeFolder]}
              </h2>
              <p className="ui-section-desc">
                {PROJECT_PURCHASE_FOLDER_DESCRIPTIONS[activeFolder]}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setNavigation(selectedProject.id, null)}
            >
              <BackArrow />
              Folders
            </Button>
          </div>

          {(error || actionError) && (
            <p className="ui-alert-danger" role="alert">
              {actionError ??
                (error instanceof Error
                  ? formatSupabaseError(error)
                  : 'Could not load purchases.')}
            </p>
          )}

          {activeFolder === 'balance' && (
            <BalanceTracker
              projectId={selectedProject.id}
              landTitle={selectedProject.title}
              landReference={projectReference}
              totalValueUsd={Number(selectedProject.funding_goal_usd ?? 0)}
            />
          )}

          {activeFolder === 'collect' && (
            <PaymentCheckoutForm
              projectId={selectedProject.id}
              projectTitle={selectedProject.title}
              landId={selectedProject.land_id}
              outstandingUsd={outstandingUsd}
              availableToPayOutUsd={availableToPayOutUsd}
              totalValueUsd={
                selectedProject.funding_goal_usd != null
                  ? Number(selectedProject.funding_goal_usd)
                  : null
              }
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
                  description="Queued MoMo purchases wait for Flutterwave; offline confirms appear here."
                />
              ) : (
                <div className="space-y-3">
                  {awaitingPayout.map((payment) => (
                    <PendingPurchaseRow
                      key={payment.id}
                      payment={payment}
                      busy={payoutId === payment.id}
                      onRetry={() => void handleGatewayPayout(payment.id)}
                    />
                  ))}
                  {pendingManual.map((payment) => (
                    <PendingManualPurchaseRow
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
              <CardHeader title="Purchase history" />
              {isLoading && (
                <div className="space-y-3" aria-busy="true">
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="ui-skeleton h-16" />
                  ))}
                </div>
              )}
              {!isLoading && filteredPayments.length === 0 && (
                <EmptyState
                  title="No purchases yet"
                  description="Record a purchase toward this project to begin."
                />
              )}
              {filteredPayments.length > 0 && (
                <div className="space-y-3">
                  {filteredPayments.map((payment) => (
                    <article
                      key={payment.id}
                      className="rounded-lg border border-border bg-surface px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {payment.receipt_number ?? 'Pending receipt'}
                          </p>
                          <p className="mt-1 text-sm text-ink">
                            {payment.disbursement_reason}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {formatUsd(payment.amount_usd)}
                            {payment.amount_ugx != null
                              ? ` · ${formatUgx(payment.amount_ugx)}`
                              : ''}
                            {' · '}
                            {paymentMethodLabel(
                              payment.method,
                              payment.mobile_money_network,
                            )}
                            {payment.manual_reference
                              ? ` · ${payment.manual_reference}`
                              : ''}
                            {' · '}
                            {formatDate(payment.created_at)}
                          </p>
                        </div>
                        <Badge tone={statusTone(payment.status)}>
                          {payment.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {payment.status === 'pending' &&
                          isGatewayPayment(payment.method) &&
                          !payment.flutterwave_tx_ref && (
                            <Button
                              size="sm"
                              onClick={() =>
                                void handleGatewayPayout(payment.id)
                              }
                              disabled={payoutId === payment.id}
                            >
                              {payoutId === payment.id
                                ? 'Sending…'
                                : 'Submit payout'}
                            </Button>
                          )}
                        {isConfirmablePending(
                          payment.status,
                          payment.method,
                        ) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleConfirm(payment.id)}
                            disabled={confirmingId === payment.id}
                          >
                            {confirmingId === payment.id
                              ? 'Confirming…'
                              : 'Confirm paid'}
                          </Button>
                        )}
                        {payment.status === 'confirmed' &&
                        payment.pdf_path ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={
                              isDownloading &&
                              downloadingPath === payment.pdf_path
                            }
                            onClick={() => {
                              if (!payment.pdf_path) return
                              setDownloadingPath(payment.pdf_path)
                              void downloadReceipt(payment.pdf_path).finally(
                                () => setDownloadingPath(null),
                              )
                            }}
                          >
                            ↓ Receipt
                          </Button>
                        ) : null}
                      </div>
                    </article>
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

function PendingPurchaseRow({
  payment,
  busy,
  onRetry,
}: {
  payment: PaymentWithLand
  busy: boolean
  onRetry: () => void
}) {
  const submitted = Boolean(payment.flutterwave_tx_ref)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-ink">
          {submitted
            ? `${paymentMethodLabel(payment.method, payment.mobile_money_network)} queued`
            : `Submit ${paymentMethodLabel(payment.method, payment.mobile_money_network)}`}
        </p>
        <p className="mt-0.5 text-sm text-ink">{payment.disbursement_reason}</p>
        <p className="mt-0.5 text-sm text-muted">
          {formatUsd(payment.amount_usd)}
          {payment.amount_ugx != null
            ? ` · ${formatUgx(payment.amount_ugx)}`
            : ''}
        </p>
      </div>
      {!submitted && (
        <Button size="sm" onClick={onRetry} disabled={busy}>
          {busy ? 'Sending…' : 'Submit payout'}
        </Button>
      )}
    </div>
  )
}

function PendingManualPurchaseRow({
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
          Confirm{' '}
          {paymentMethodLabel(payment.method, payment.mobile_money_network)}
        </p>
        <p className="mt-0.5 text-sm text-ink">{payment.disbursement_reason}</p>
        <p className="mt-0.5 text-sm text-muted">
          {formatUsd(payment.amount_usd)}
          {payment.manual_reference ? (
            <span className="ml-2 font-mono text-xs text-ink">
              {payment.manual_reference}
            </span>
          ) : null}
        </p>
      </div>
      <Button size="sm" onClick={onConfirm} disabled={confirming}>
        {confirming ? 'Confirming…' : 'Confirm paid'}
      </Button>
    </div>
  )
}
