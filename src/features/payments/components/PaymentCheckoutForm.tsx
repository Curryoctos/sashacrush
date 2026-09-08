import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Banknote, Bitcoin, Check, CreditCard, ShieldCheck } from 'lucide-react'
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

interface PaymentCheckoutFormProps {
  landId: string
  landTitle: string
  /** Confirmed outstanding (total − paid). */
  outstandingUsd: number | null
  /** Soft cap for new payouts (outstanding − pending). */
  availableToPayOutUsd: number | null
  totalValueUsd: number | null
  /** Company capital available (raised − disbursed). Soft warning only. */
  companyCapitalAvailableUsd?: number | null
  isSubmitting: boolean
  onSubmit: (input: CreatePaymentInput) => Promise<void>
}

export function PaymentCheckoutForm({
  landId,
  landTitle,
  outstandingUsd,
  availableToPayOutUsd,
  totalValueUsd,
  companyCapitalAvailableUsd = null,
  isSubmitting,
  onSubmit,
}: PaymentCheckoutFormProps) {
  const [amountUsd, setAmountUsd] = useState('')
  const [amountUgx, setAmountUgx] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('mtn')
  const [ugxRate, setUgxRate] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [manualReference] = useState(() => generateManualPaymentReference(landId))

  const isMobileMoney = paymentChoice === 'mtn' || paymentChoice === 'airtel'
  const isGateway = isGatewayChoice(paymentChoice)
  const isCrypto = paymentChoice === 'crypto'
  const isStripe = paymentChoice === 'stripe'
  const parsedUsd = Number(amountUsd)
  const hasValidUsd = Number.isFinite(parsedUsd) && parsedUsd > 0
  const fillAmount = availableToPayOutUsd ?? outstandingUsd
  const capitalWarning =
    hasValidUsd && companyCapitalAvailableUsd != null
      ? capitalShortfallWarning(companyCapitalAvailableUsd, parsedUsd)
      : null

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (isCrypto || isStripe) {
      setFormError(
        isStripe
          ? 'Card payouts are not available. Use MoMo or manual transfer.'
          : 'Crypto payouts are not available yet.',
      )
      return
    }

    const { method, network } = paymentDetails(paymentChoice)
    // Pass raw phone when present so validation can distinguish empty vs invalid format.
    const phoneInput = isMobileMoney ? recipientPhone.trim() || null : null
    const normalizedPhone = phoneInput ? normalizeUgandaPhone(phoneInput) : null

    try {
      await onSubmit({
        landId,
        amountUsd: Number(amountUsd),
        amountUgx: amountUgx.trim() ? Number(amountUgx) : null,
        method,
        mobileMoneyNetwork: network,
        recipientPhone: normalizedPhone ?? phoneInput,
        manualReference: method === 'manual' ? manualReference : null,
        rateUsed: isMobileMoney && ugxRate != null ? ugxRate : null,
        totalValueUsd,
        availableToPayOutUsd,
      })
      setAmountUsd('')
      setAmountUgx('')
      setRecipientPhone('')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not start payout.')
    }
  }

  return (
    <Card>
      <CardHeader
        title="Pay out to seller"
        description={`Disburse funds for ${landTitle}. MoMo sends from the company Flutterwave balance; manual uses a WU reference.`}
      />

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
        <ol className="grid gap-3 sm:grid-cols-3">
          <CheckoutStep n={1} title="Amount" active />
          <CheckoutStep n={2} title="Payout method" active={hasValidUsd} />
          <CheckoutStep
            n={3}
            title={
              isGateway ? 'Send to seller' : paymentChoice === 'manual' ? 'Reference' : 'Record'
            }
            active={hasValidUsd}
          />
        </ol>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <label htmlFor="checkout-amount-usd" className="ui-label">
              Amount (USD)
            </label>
            {fillAmount != null && fillAmount > 0 && (
              <button
                type="button"
                onClick={fillAvailable}
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
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
            className="ui-input max-w-xs text-lg font-semibold"
          />
          <div className="space-y-1 text-xs text-muted">
            {outstandingUsd != null && (
              <p>Outstanding (after confirmed): {formatUsd(Math.max(0, outstandingUsd))}</p>
            )}
            {availableToPayOutUsd != null && (
              <p>
                Available to pay out (minus pending):{' '}
                {formatUsd(Math.max(0, availableToPayOutUsd))}
              </p>
            )}
            {companyCapitalAvailableUsd != null && (
              <p>Company capital available: {formatUsd(Math.max(0, companyCapitalAvailableUsd))}</p>
            )}
            {capitalWarning && (
              <p className="text-warning" role="status">
                {capitalWarning}
              </p>
            )}
          </div>
        </section>

        <section>
          <fieldset>
            <legend className="ui-label">How should the seller be paid?</legend>
            <p className="mt-1 text-xs text-muted">
              MoMo disburses to the seller’s wallet. Manual creates a WU reference for cash/wire.
            </p>
            <div
              role="radiogroup"
              aria-label="Payout method"
              className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              <PaymentMethodCard
                selected={paymentChoice === 'mtn'}
                onClick={() => setPaymentChoice('mtn')}
                title="MTN MoMo"
                description="Uganda · Flutterwave transfer"
                logo={<NetworkLogo label="MTN" />}
                badge="Payout"
              />
              <PaymentMethodCard
                selected={paymentChoice === 'airtel'}
                onClick={() => setPaymentChoice('airtel')}
                title="Airtel Money"
                description="Uganda · Flutterwave transfer"
                logo={<NetworkLogo label="Airtel" />}
                badge="Payout"
              />
              <PaymentMethodCard
                selected={paymentChoice === 'manual'}
                onClick={() => setPaymentChoice('manual')}
                title="Bank / cash"
                description="WU reference · confirm later"
                logo={<Banknote className="h-6 w-6 text-brand-700" />}
              />
              <PaymentMethodCard
                selected={paymentChoice === 'stripe'}
                onClick={() => setPaymentChoice('stripe')}
                title="Card"
                description="Not used for seller payouts"
                logo={<StripeCardLogo />}
                badge="Unavailable"
                disabled
              />
              <PaymentMethodCard
                selected={paymentChoice === 'crypto'}
                onClick={() => setPaymentChoice('crypto')}
                title="Crypto"
                description="Wallet payout — later phase"
                logo={<Bitcoin className="h-6 w-6 text-muted" />}
                badge="Coming soon"
                disabled
              />
            </div>
          </fieldset>
        </section>

        {isMobileMoney && (
          <section className="space-y-4 rounded-lg border border-border bg-surface px-4 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                Seller mobile money
              </p>
              <p className="mt-1 text-sm text-muted">
                Confirm USD/UGX, then enter the seller’s receive number.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="ui-label">USD</span>
                <p className="mt-1 font-display text-xl font-semibold text-ink">
                  {hasValidUsd ? formatUsd(parsedUsd) : '—'}
                </p>
              </div>
              <div>
                <label htmlFor="checkout-amount-ugx" className="ui-label">
                  UGX (sent)
                </label>
                <input
                  id="checkout-amount-ugx"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amountUgx}
                  onChange={(event) => setAmountUgx(event.target.value)}
                  className="ui-input mt-1"
                />
                {ugxRate != null && (
                  <p className="ui-hint">
                    Live rate ~{Math.round(ugxRate).toLocaleString('en-UG')} UGX / USD
                  </p>
                )}
              </div>
            </div>

            <label className="block">
              <span className="ui-label">Seller receive phone</span>
              <input
                className="ui-input mt-1 max-w-sm"
                type="tel"
                inputMode="tel"
                required
                value={recipientPhone}
                onChange={(event) => setRecipientPhone(event.target.value)}
                placeholder="07XXXXXXXX or +2567XXXXXXXX"
                aria-label="Seller mobile money phone number"
              />
              <p className="ui-hint">UGX is sent to this MTN or Airtel wallet.</p>
            </label>
          </section>
        )}

        {paymentChoice === 'manual' && (
          <section className="rounded-lg border border-border bg-surface px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Manual payout reference
            </p>
            <p className="mt-2 font-mono text-lg font-semibold text-ink">{manualReference}</p>
            <p className="mt-1 text-sm text-muted">
              Use this code on the wire/cash payout. It is stored on the payment and printed on the
              seller receipt after you confirm.
            </p>
          </section>
        )}

        <section className="rounded-lg border border-brand-200 bg-brand-50/60 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
                Payout summary
              </p>
              <p className="mt-2 font-display text-2xl font-semibold text-ink">
                {hasValidUsd ? formatUsd(parsedUsd) : '—'}
              </p>
              <p className="mt-1 text-sm text-muted">{landTitle}</p>
              {isMobileMoney && amountUgx.trim() && Number(amountUgx) > 0 && (
                <p className="mt-1 text-sm text-muted">{formatUgx(Number(amountUgx))}</p>
              )}
            </div>
            <div className="max-w-sm text-sm text-muted">
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                <span>{checkoutProviderHint(paymentChoice)}</span>
              </p>
            </div>
          </div>

          {formError && (
            <p className="ui-alert-danger mt-4" role="alert">
              {formError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || !landId || isCrypto || isStripe}
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
                Stays on this portal — Flutterwave moves funds from the company balance.
              </p>
            )}
          </div>
        </section>
      </form>
    </Card>
  )
}

function CheckoutStep({
  n,
  title,
  active,
}: {
  n: number
  title: string
  active: boolean
}) {
  return (
    <li
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
        active ? 'border-brand-200 bg-brand-50 text-ink' : 'border-border bg-white text-muted'
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold ${
          active ? 'bg-brand-700 text-white' : 'bg-surface text-muted'
        }`}
      >
        {n}
      </span>
      {title}
    </li>
  )
}

function PaymentMethodCard({
  selected,
  onClick,
  title,
  description,
  logo,
  badge,
  disabled = false,
}: {
  selected: boolean
  onClick: () => void
  title: string
  description: string
  logo: ReactNode
  badge?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onClick}
      className={`relative flex min-h-20 items-center gap-3 rounded-lg border p-3 text-left transition ${
        disabled
          ? 'cursor-not-allowed border-border bg-surface opacity-60'
          : selected
            ? 'border-brand-700 bg-brand-50'
            : 'border-border bg-white hover:border-brand-200 hover:bg-surface'
      }`}
    >
      <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-surface">
        {logo}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
        {badge && (
          <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-700">
            {badge}
          </span>
        )}
      </span>
      {!disabled && (
        <span
          className={`absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-md border ${
            selected ? 'border-brand-700 bg-brand-700 text-white' : 'border-border bg-white'
          }`}
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      )}
    </button>
  )
}

function StripeCardLogo() {
  return (
    <span className="flex items-center gap-1.5 text-ink">
      <CreditCard className="h-5 w-5 text-muted" />
      <span className="text-xs font-semibold tracking-tight">Stripe</span>
    </span>
  )
}

function NetworkLogo({ label }: { label: string }) {
  return <span className="text-xs font-semibold tracking-tight text-ink">{label}</span>
}
