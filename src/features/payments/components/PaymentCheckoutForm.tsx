import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Banknote, Bitcoin, Check, CreditCard, ExternalLink, ShieldCheck } from 'lucide-react'
import {
  checkoutCtaLabel,
  checkoutProviderHint,
  isGatewayChoice,
  paymentDetails,
  type PaymentChoice,
} from '@/features/payments/paymentMethods'
import { fetchUsdToUgxRate } from '@/features/payments/usdUgxRate'
import type { CreatePaymentInput } from '@/features/payments/validation'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatUgx, formatUsd } from '@/lib/formatters'

interface PaymentCheckoutFormProps {
  landId: string
  landTitle: string
  outstandingUsd: number | null
  totalValueUsd: number | null
  isSubmitting: boolean
  onSubmit: (input: CreatePaymentInput) => Promise<void>
}

export function PaymentCheckoutForm({
  landId,
  landTitle,
  outstandingUsd,
  totalValueUsd,
  isSubmitting,
  onSubmit,
}: PaymentCheckoutFormProps) {
  const [amountUsd, setAmountUsd] = useState('')
  const [amountUgx, setAmountUgx] = useState('')
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('stripe')
  const [ugxRate, setUgxRate] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const isMobileMoney = paymentChoice === 'mtn' || paymentChoice === 'airtel'
  const isGateway = isGatewayChoice(paymentChoice)
  const parsedUsd = Number(amountUsd)
  const hasValidUsd = Number.isFinite(parsedUsd) && parsedUsd > 0

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
    // Keep UGX in sync with USD for MoMo so staff don't do mental FX math.
    setAmountUgx(String(Math.round(parsedUsd * ugxRate)))
  }, [hasValidUsd, isMobileMoney, parsedUsd, ugxRate])

  const fillOutstanding = () => {
    if (outstandingUsd == null || outstandingUsd <= 0) {
      return
    }
    setAmountUsd(outstandingUsd.toFixed(2))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const { method, network } = paymentDetails(paymentChoice)
    try {
      await onSubmit({
        landId,
        amountUsd: Number(amountUsd),
        amountUgx: amountUgx.trim() ? Number(amountUgx) : null,
        method,
        mobileMoneyNetwork: network,
        totalValueUsd,
        remainingOutstandingUsd: outstandingUsd,
      })
      setAmountUsd('')
      setAmountUgx('')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not start checkout.')
    }
  }

  return (
    <Card>
      <CardHeader
        title="Collect payment"
        description={`Checkout for ${landTitle}. Card and mobile money open the provider’s secure hosted page.`}
      />

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
        <ol className="grid gap-3 sm:grid-cols-3">
          <CheckoutStep n={1} title="Amount" active />
          <CheckoutStep n={2} title="Payment method" active={hasValidUsd} />
          <CheckoutStep n={3} title={isGateway ? 'Pay securely' : 'Record'} active={hasValidUsd} />
        </ol>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <label htmlFor="checkout-amount-usd" className="ui-label">
              Amount (USD)
            </label>
            {outstandingUsd != null && outstandingUsd > 0 && (
              <button
                type="button"
                onClick={fillOutstanding}
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                Use outstanding {formatUsd(outstandingUsd)}
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
          {outstandingUsd != null && (
            <p className="ui-hint">
              Outstanding balance: {formatUsd(Math.max(0, outstandingUsd))}
            </p>
          )}
        </section>

        <section>
          <fieldset>
            <legend className="ui-label">How will this be paid?</legend>
            <p className="mt-1 text-xs text-muted">
              Pick the channel the payer will use. Gateway methods redirect to Stripe or Flutterwave.
            </p>
            <div
              role="radiogroup"
              aria-label="Payment method"
              className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              <PaymentMethodCard
                selected={paymentChoice === 'stripe'}
                onClick={() => setPaymentChoice('stripe')}
                title="Card"
                description="Visa, Mastercard · Stripe"
                logo={<StripeCardLogo />}
                badge="Instant checkout"
              />
              <PaymentMethodCard
                selected={paymentChoice === 'mtn'}
                onClick={() => setPaymentChoice('mtn')}
                title="MTN MoMo"
                description="Uganda · Flutterwave"
                logo={<NetworkLogo label="MTN" />}
                badge="Mobile money"
              />
              <PaymentMethodCard
                selected={paymentChoice === 'airtel'}
                onClick={() => setPaymentChoice('airtel')}
                title="Airtel Money"
                description="Uganda · Flutterwave"
                logo={<NetworkLogo label="Airtel" />}
                badge="Mobile money"
              />
              <PaymentMethodCard
                selected={paymentChoice === 'manual'}
                onClick={() => setPaymentChoice('manual')}
                title="Bank / cash"
                description="Confirm after transfer"
                logo={<Banknote className="h-6 w-6 text-brand-700" />}
              />
              <PaymentMethodCard
                selected={paymentChoice === 'crypto'}
                onClick={() => setPaymentChoice('crypto')}
                title="Crypto"
                description="Confirm after conversion"
                logo={<Bitcoin className="h-6 w-6 text-warning" />}
              />
            </div>
          </fieldset>
        </section>

        {isMobileMoney && (
          <section className="rounded-lg border border-border bg-surface px-4 py-4">
            <label htmlFor="checkout-amount-ugx" className="ui-label">
              Amount (UGX)
            </label>
            <p className="ui-hint mb-2">
              Flutterwave charges Uganda mobile money in UGX
              {ugxRate != null ? ` · ~${Math.round(ugxRate).toLocaleString('en-UG')} UGX / USD` : ''}.
            </p>
            <input
              id="checkout-amount-ugx"
              type="number"
              min="1"
              step="1"
              required
              value={amountUgx}
              onChange={(event) => setAmountUgx(event.target.value)}
              className="ui-input max-w-xs"
            />
            {amountUgx.trim() && Number(amountUgx) > 0 && (
              <p className="mt-2 text-sm text-muted">Payer will see {formatUgx(Number(amountUgx))}.</p>
            )}
          </section>
        )}

        <section className="rounded-lg border border-brand-200 bg-brand-50/60 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
                Order summary
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
            <Button type="submit" disabled={isSubmitting || !landId} size="lg">
              {isSubmitting ? (
                isGateway ? 'Redirecting to checkout…' : 'Recording…'
              ) : (
                <>
                  {checkoutCtaLabel(paymentChoice, hasValidUsd ? parsedUsd : null)}
                  {isGateway && <ExternalLink className="h-4 w-4" />}
                </>
              )}
            </Button>
            {isGateway && (
              <p className="text-xs text-muted">
                You leave this page briefly, pay on the provider, then return here.
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
}: {
  selected: boolean
  onClick: () => void
  title: string
  description: string
  logo: ReactNode
  badge?: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`relative flex min-h-20 items-center gap-3 rounded-lg border p-3 text-left transition ${
        selected
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
      <span
        className={`absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-md border ${
          selected ? 'border-brand-700 bg-brand-700 text-white' : 'border-border bg-white'
        }`}
      >
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
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
