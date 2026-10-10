import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Bitcoin, Check, ChevronLeft, ShieldCheck } from 'lucide-react'
import {
  checkoutCtaLabel,
  checkoutProviderHint,
  isGatewayChoice,
  paymentDetails,
  type PaymentChoice,
} from '@/features/payments/paymentMethods'
import { fetchUsdToUgxRate } from '@/features/payments/usdUgxRate'
import {
  normalizeUgandaPhone,
  type CreatePaymentInput,
} from '@/features/payments/validation'
import { capitalShortfallWarning } from '@/features/investments/companyCapital'
import { generateManualPaymentReference } from '@/lib/landReference'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatUgx, formatUsd } from '@/lib/formatters'
import airtelLogo from '@/assets/brands/Airtel_Uganda.svg'
import mtnLogo from '@/assets/brands/mtn-telecom-uganda.svg'

type CheckoutStepId = 1 | 2 | 3

interface PaymentCheckoutFormProps {
  /** Required project this purchase/disbursement is for. */
  projectId: string
  projectTitle: string
  /** Optional land linkage for land_acquisition projects. */
  landId?: string | null
  /** Confirmed outstanding (total − paid). */
  outstandingUsd: number | null
  /** Soft cap for new payouts (outstanding − pending). */
  availableToPayOutUsd: number | null
  totalValueUsd: number | null
  /** Company capital available (raised − disbursed). Hard-blocks when exceeded. */
  companyCapitalAvailableUsd?: number | null
  isSubmitting: boolean
  onSubmit: (input: CreatePaymentInput) => Promise<void>
}

export function PaymentCheckoutForm({
  projectId,
  projectTitle,
  landId = null,
  outstandingUsd,
  availableToPayOutUsd,
  totalValueUsd,
  companyCapitalAvailableUsd = null,
  isSubmitting,
  onSubmit,
}: PaymentCheckoutFormProps) {
  const targetTitle = projectTitle || 'Project'
  const payeeLabel = 'payee'

  const [step, setStep] = useState<CheckoutStepId>(1)
  const [amountUsd, setAmountUsd] = useState('')
  const [amountUgx, setAmountUgx] = useState('')
  const [disbursementReason, setDisbursementReason] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('mtn')
  const [ugxRate, setUgxRate] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [manualReference] = useState(() =>
    generateManualPaymentReference(projectId || 'purchase'),
  )

  const isMobileMoney = paymentChoice === 'mtn' || paymentChoice === 'airtel'
  const isGateway = isGatewayChoice(paymentChoice)
  const isCrypto = paymentChoice === 'crypto'
  const parsedUsd = Number(amountUsd)
  const hasValidUsd = Number.isFinite(parsedUsd) && parsedUsd > 0
  const reasonOk = disbursementReason.trim().length >= 3
  const fillAmount = availableToPayOutUsd ?? outstandingUsd
  const capitalWarning =
    hasValidUsd && companyCapitalAvailableUsd != null
      ? capitalShortfallWarning(companyCapitalAvailableUsd, parsedUsd)
      : null
  const capitalBlocksSubmit = Boolean(capitalWarning)

  useEffect(() => {
    let cancelled = false
    void fetchUsdToUgxRate().then((rate) => {
      if (!cancelled) {
        setUgxRate(rate)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isMobileMoney || !hasValidUsd || ugxRate == null) {
      return
    }
    setAmountUgx(String(Math.round(parsedUsd * ugxRate)))
  }, [hasValidUsd, isMobileMoney, parsedUsd, ugxRate])

  const fillAvailable = () => {
    if (fillAmount == null || fillAmount <= 0) {
      return
    }
    setAmountUsd(fillAmount.toFixed(2))
  }

  const goToStep = (next: CheckoutStepId) => {
    setFormError(null)
    setStep(next)
  }

  const continueFromAmount = () => {
    setFormError(null)
    if (!hasValidUsd) {
      setFormError('Enter a purchase amount greater than zero.')
      return
    }
    if (!reasonOk) {
      setFormError('Enter a disbursement reason (at least 3 characters).')
      return
    }
    if (capitalWarning) {
      setFormError(capitalWarning)
      return
    }
    goToStep(2)
  }

  const continueFromMethod = () => {
    setFormError(null)
    if (isCrypto) {
      return
    }
    goToStep(3)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (isCrypto) {
      setFormError(
        'Use Owner Wallet → Convert and Pay to fund a project from crypto.',
      )
      return
    }

    if (disbursementReason.trim().length < 3) {
      setFormError('Enter a disbursement reason (at least 3 characters).')
      return
    }

    const capitalBlock =
      companyCapitalAvailableUsd != null
        ? capitalShortfallWarning(companyCapitalAvailableUsd, Number(amountUsd))
        : null
    if (capitalBlock) {
      setFormError(capitalBlock)
      return
    }

    const { method, network } = paymentDetails(paymentChoice)
    // Pass raw phone when present so validation can distinguish empty vs invalid format.
    const phoneInput = isMobileMoney ? recipientPhone.trim() || null : null
    const normalizedPhone = phoneInput ? normalizeUgandaPhone(phoneInput) : null

    try {
      await onSubmit({
        projectId,
        landId: landId || null,
        disbursementReason,
        amountUsd: Number(amountUsd),
        amountUgx: amountUgx.trim() ? Number(amountUgx) : null,
        method,
        mobileMoneyNetwork: network,
        recipientPhone: normalizedPhone ?? phoneInput,
        manualReference: method === 'manual' ? manualReference : null,
        rateUsed: isMobileMoney && ugxRate != null ? ugxRate : null,
        totalValueUsd,
        availableToPayOutUsd,
        companyCapitalAvailableUsd,
      })
      setAmountUsd('')
      setAmountUgx('')
      setDisbursementReason('')
      setRecipientPhone('')
      setStep(1)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not start payout.')
    }
  }

  const methodLabel =
    paymentChoice === 'mtn'
      ? 'MTN MoMo'
      : paymentChoice === 'airtel'
        ? 'Airtel Money'
        : paymentChoice === 'manual'
          ? 'Bank / cash'
          : 'Crypto wallet'

  return (
    <Card>
      <CardHeader
        title="Record purchase"
        description={`Disburse toward ${targetTitle}. MoMo sends from Flutterwave; manual uses a WU reference.`}
      />

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
        <CapitalContext
          outstandingUsd={outstandingUsd}
          availableToPayOutUsd={availableToPayOutUsd}
          companyCapitalAvailableUsd={companyCapitalAvailableUsd}
        />

        <StepRail
          step={step}
          amountDone={hasValidUsd && reasonOk && !capitalWarning}
          methodDone={step >= 3}
        />

        {step > 1 && (
          <ProgressSummary
            amountUsd={hasValidUsd ? parsedUsd : null}
            reason={disbursementReason}
            methodLabel={step >= 2 ? methodLabel : null}
            onEditAmount={() => goToStep(1)}
            onEditMethod={step >= 3 ? () => goToStep(2) : undefined}
          />
        )}

        {step === 1 && (
          <section className="space-y-4" aria-labelledby="checkout-step-amount">
            <StepHeading
              id="checkout-step-amount"
              n={1}
              title="Amount & reason"
              description="How much leaves company capital, and why."
            />

            <div className="ui-field max-w-xs">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <label htmlFor="checkout-amount-usd" className="ui-label">
                  Amount (USD)
                </label>
                {fillAmount != null && fillAmount > 0 && (
                  <button
                    type="button"
                    onClick={fillAvailable}
                    className="text-xs font-bold text-ink hover:text-ink"
                  >
                    Use available {formatUsd(fillAmount)}
                  </button>
                )}
              </div>
              <input
                id="checkout-amount-usd"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amountUsd}
                onChange={(event) => setAmountUsd(event.target.value)}
                placeholder="0.00"
                className="ui-input text-lg font-extrabold"
              />
              {capitalWarning && (
                <p className="mt-1 text-xs font-semibold text-danger" role="alert">
                  {capitalWarning}
                </p>
              )}
            </div>

            <div className="ui-field">
              <label htmlFor="checkout-disbursement-reason" className="ui-label">
                Disbursement reason
              </label>
              <textarea
                id="checkout-disbursement-reason"
                required
                minLength={3}
                maxLength={500}
                rows={3}
                value={disbursementReason}
                onChange={(event) => setDisbursementReason(event.target.value)}
                placeholder="e.g. Seller installment 2 of 4 · fencing materials · community well contractor"
                className="ui-input min-h-[5.5rem] resize-y"
              />
              <p className="ui-hint">
                Required. Explains why this purchase is charged to the project.
              </p>
            </div>

            {formError && (
              <p className="ui-alert-danger" role="alert">
                {formError}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                size="lg"
                disabled={!hasValidUsd || !reasonOk || capitalBlocksSubmit}
                onClick={continueFromAmount}
              >
                Continue to payout method
              </Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4" aria-labelledby="checkout-step-method">
            <StepHeading
              id="checkout-step-method"
              n={2}
              title="Payout method"
              description={`How the ${payeeLabel} should receive funds.`}
            />

            <fieldset>
              <legend className="sr-only">Payout method</legend>
              <div
                role="radiogroup"
                aria-label="Payout method"
                className="grid gap-3 sm:grid-cols-3"
              >
                <PaymentMethodCard
                  selected={paymentChoice === 'mtn'}
                  onClick={() => setPaymentChoice('mtn')}
                  title="MTN MoMo"
                  description="Uganda · Flutterwave"
                  logo={<NetworkLogo network="mtn" />}
                />
                <PaymentMethodCard
                  selected={paymentChoice === 'airtel'}
                  onClick={() => setPaymentChoice('airtel')}
                  title="Airtel Money"
                  description="Uganda · Flutterwave"
                  logo={<NetworkLogo network="airtel" />}
                />
                <PaymentMethodCard
                  selected={paymentChoice === 'manual'}
                  onClick={() => setPaymentChoice('manual')}
                  title="Bank / cash"
                  description="WU reference · confirm later"
                  logo={<Banknote className="h-6 w-6 text-ink" />}
                />
              </div>
            </fieldset>

            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <Bitcoin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>Paying from crypto?</span>
              <Link
                to="/admin/wallet/convert"
                className="font-semibold text-ink underline-offset-2 hover:underline"
              >
                Open Convert and Pay
              </Link>
            </p>

            {formError && (
              <p className="ui-alert-danger" role="alert">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => goToStep(1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
                Back
              </Button>
              <Button type="button" size="lg" onClick={continueFromMethod}>
                Continue to {paymentChoice === 'manual' ? 'reference' : 'payee details'}
              </Button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-5" aria-labelledby="checkout-step-confirm">
            <StepHeading
              id="checkout-step-confirm"
              n={3}
              title={isMobileMoney ? 'Payee & confirm' : 'Reference & confirm'}
              description={
                isMobileMoney
                  ? 'Enter the receive number, then send the purchase.'
                  : 'Use the WU reference on the wire or cash payout, then record it.'
              }
            />

            {isMobileMoney && (
              <div className="space-y-4 rounded-xl border border-border/90 bg-surface/70 px-5 py-5">
                <div className="ui-field-row">
                  <div className="ui-field">
                    <span className="ui-label">USD</span>
                    <p className="text-[28px] font-semibold text-ink">
                      {hasValidUsd ? formatUsd(parsedUsd) : '—'}
                    </p>
                  </div>
                  <div className="ui-field">
                    <span className="ui-label">Payee receives (UGX)</span>
                    <p className="text-[28px] font-semibold text-ink">
                      {amountUgx.trim() && Number(amountUgx) > 0
                        ? formatUgx(Number(amountUgx))
                        : '—'}
                    </p>
                    {ugxRate != null && (
                      <p className="ui-hint">
                        Live rate ~{Math.round(ugxRate).toLocaleString('en-UG')} UGX /
                        USD
                      </p>
                    )}
                  </div>
                </div>

                <div className="ui-field max-w-sm">
                  <label htmlFor="seller-momo-phone" className="ui-label">
                    Payee receive phone
                  </label>
                  <input
                    id="seller-momo-phone"
                    className="ui-input"
                    type="tel"
                    inputMode="tel"
                    required
                    value={recipientPhone}
                    onChange={(event) => setRecipientPhone(event.target.value)}
                    placeholder="07XXXXXXXX or +2567XXXXXXXX"
                    aria-label="Payee mobile money phone number"
                  />
                  <p className="ui-hint">UGX is sent to this MTN or Airtel wallet.</p>
                </div>
              </div>
            )}

            {paymentChoice === 'manual' && (
              <div className="rounded-lg border border-border bg-surface px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Manual payout reference
                </p>
                <p className="mt-2 font-mono text-lg font-semibold text-ink">
                  {manualReference}
                </p>
                <p className="mt-1 text-sm text-muted">
                  Use this code on the wire/cash payout. It is stored on the payment and
                  printed on the receipt after you confirm.
                </p>
              </div>
            )}

            <div className="rounded-lg border border-border bg-surface px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink">
                    Purchase summary
                  </p>
                  <p className="mt-2 text-[28px] font-semibold text-ink">
                    {hasValidUsd ? formatUsd(parsedUsd) : '—'}
                  </p>
                  <p className="mt-1 text-sm text-muted">{targetTitle}</p>
                  {disbursementReason.trim() ? (
                    <p className="mt-1 text-sm text-muted">{disbursementReason.trim()}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-muted">{methodLabel}</p>
                  {isMobileMoney && amountUgx.trim() && Number(amountUgx) > 0 && (
                    <p className="mt-1 text-sm text-muted">
                      {formatUgx(Number(amountUgx))}
                    </p>
                  )}
                </div>
                <div className="max-w-sm text-sm text-muted">
                  <p className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink" />
                    <span>{checkoutProviderHint(paymentChoice)}</span>
                  </p>
                </div>
              </div>

              {formError && (
                <p className="ui-alert-danger mt-4" role="alert">
                  {formError}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => goToStep(2)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
                  Back
                </Button>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !projectId || capitalBlocksSubmit}
                    size="lg"
                  >
                    {isSubmitting
                      ? isGateway
                        ? 'Sending payout…'
                        : 'Recording…'
                      : checkoutCtaLabel(paymentChoice, hasValidUsd ? parsedUsd : null)}
                  </Button>
                  {isGateway && (
                    <p className="text-xs text-muted">
                      Stays on this portal — Flutterwave moves funds from company balance.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </form>
    </Card>
  )
}

function CapitalContext({
  outstandingUsd,
  availableToPayOutUsd,
  companyCapitalAvailableUsd,
}: {
  outstandingUsd: number | null
  availableToPayOutUsd: number | null
  companyCapitalAvailableUsd: number | null
}) {
  const items = [
    outstandingUsd != null
      ? { label: 'Outstanding', value: formatUsd(Math.max(0, outstandingUsd)) }
      : null,
    availableToPayOutUsd != null
      ? {
          label: 'Available to pay out',
          value: formatUsd(Math.max(0, availableToPayOutUsd)),
        }
      : null,
    companyCapitalAvailableUsd != null
      ? {
          label: 'Company capital',
          value: formatUsd(Math.max(0, companyCapitalAvailableUsd)),
        }
      : null,
  ].filter(Boolean) as { label: string; value: string }[]

  if (items.length === 0) return null

  return (
    <dl className="grid gap-2 rounded-lg border border-border bg-surface px-3 py-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function StepRail({
  step,
  amountDone,
  methodDone,
}: {
  step: CheckoutStepId
  amountDone: boolean
  methodDone: boolean
}) {
  const steps = [
    { n: 1 as const, title: 'Amount', done: amountDone || step > 1 },
    { n: 2 as const, title: 'Method', done: methodDone || step > 2 },
    { n: 3 as const, title: 'Confirm', done: false },
  ]

  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Checkout steps">
      {steps.map((item, index) => {
        const current = step === item.n
        return (
          <li key={item.n} className="flex items-center gap-2">
            {index > 0 && (
              <span className="hidden h-px w-4 bg-border sm:block" aria-hidden />
            )}
            <span
              className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm ${
                current
                  ? 'bg-ink text-ink-inverse'
                  : item.done
                    ? 'bg-surface text-ink'
                    : 'bg-surface-elevated text-muted'
              }`}
              aria-current={current ? 'step' : undefined}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold ${
                  current
                    ? 'bg-ink-inverse/15 text-ink-inverse'
                    : item.done
                      ? 'bg-ink text-ink-inverse'
                      : 'bg-surface text-muted'
                }`}
              >
                {item.done && !current ? (
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                ) : (
                  item.n
                )}
              </span>
              {item.title}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function StepHeading({
  id,
  n,
  title,
  description,
}: {
  id: string
  n: number
  title: string
  description: string
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Step {n}
      </p>
      <h3 id={id} className="mt-1 text-[15px] font-medium tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>
    </div>
  )
}

function ProgressSummary({
  amountUsd,
  reason,
  methodLabel,
  onEditAmount,
  onEditMethod,
}: {
  amountUsd: number | null
  reason: string
  methodLabel: string | null
  onEditAmount: () => void
  onEditMethod?: () => void
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-surface-elevated px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="font-semibold tabular-nums text-ink">
            {amountUsd != null ? formatUsd(amountUsd) : '—'}
            {methodLabel ? (
              <span className="font-normal text-muted"> · {methodLabel}</span>
            ) : null}
          </p>
          {reason.trim() ? (
            <p className="truncate text-muted">{reason.trim()}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEditAmount}
            className="text-xs font-semibold text-ink underline-offset-2 hover:underline"
          >
            Edit amount
          </button>
          {onEditMethod ? (
            <button
              type="button"
              onClick={onEditMethod}
              className="text-xs font-semibold text-ink underline-offset-2 hover:underline"
            >
              Edit method
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function PaymentMethodCard({
  selected,
  onClick,
  title,
  description,
  logo,
}: {
  selected: boolean
  onClick: () => void
  title: string
  description: string
  logo: ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`relative flex min-h-[4.5rem] items-center gap-3 rounded-lg border p-3 text-left transition ${
        selected
          ? 'border-ink bg-surface'
          : 'border-border bg-surface-elevated hover:border-muted/40 hover:bg-surface'
      }`}
    >
      <span className="relative flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
        {logo}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
      </span>
      <span
        className={`absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-md border ${
          selected ? 'border-ink bg-ink text-ink-inverse' : 'border-border bg-surface-elevated'
        }`}
      >
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </button>
  )
}

function NetworkLogo({ network }: { network: 'mtn' | 'airtel' }) {
  const src = network === 'mtn' ? mtnLogo : airtelLogo
  const alt = network === 'mtn' ? 'MTN' : 'Airtel'
  return (
    <img
      src={src}
      alt={alt}
      className={
        network === 'mtn'
          ? 'absolute inset-0 h-full w-full object-cover'
          : 'h-7 w-11 object-contain'
      }
      draggable={false}
    />
  )
}
