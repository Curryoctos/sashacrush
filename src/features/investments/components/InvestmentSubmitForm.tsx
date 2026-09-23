import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import {
  investmentMethodLabel,
  isStripeInvestmentMethod,
  type CreateInvestmentInput,
} from '@/features/investments/validation'
import { formatUsd } from '@/lib/formatters'
import type { InvestmentMethod } from '@/types/database'

export interface InvestableDealOption {
  id: string
  title: string
  total_value_usd?: number
}

interface InvestmentSubmitFormProps {
  deals: InvestableDealOption[]
  dealsLoading?: boolean
  isSubmitting: boolean
  onSubmit: (input: CreateInvestmentInput) => Promise<void>
}

const METHODS: InvestmentMethod[] = ['stripe', 'bank_transfer', 'mobile_money', 'other']

export function InvestmentSubmitForm({
  deals,
  dealsLoading = false,
  isSubmitting,
  onSubmit,
}: InvestmentSubmitFormProps) {
  const [landId, setLandId] = useState('')
  const [amountUsd, setAmountUsd] = useState('')
  const [method, setMethod] = useState<InvestmentMethod>('stripe')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const isStripe = isStripeInvestmentMethod(method)
  const selectedDeal = deals.find((deal) => deal.id === landId)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    try {
      await onSubmit({
        landId,
        amountUsd: Number(amountUsd),
        method,
        reference: isStripe ? null : reference,
        notes: notes.trim() || null,
      })
      if (!isStripe) {
        setAmountUsd('')
        setReference('')
        setNotes('')
        setMethod('stripe')
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Could not submit investment.'
      setFormError(message)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Invest toward a deal"
        description={
          isStripe
            ? 'Choose a project, pay by card. Confirmed funds go into the company capital pool earmarked for that deal.'
            : 'Choose a project, transfer offline, then record amount and reference for admin confirmation into the capital pool.'
        }
      />
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        {formError && (
          <p className="ui-alert-danger" role="alert">
            {formError}
          </p>
        )}

        <label className="block space-y-1.5">
          <span className="ui-label">Deal / project</span>
          <select
            className="ui-input"
            value={landId}
            onChange={(event) => setLandId(event.target.value)}
            required
            disabled={dealsLoading || isSubmitting}
          >
            <option value="">{dealsLoading ? 'Loading deals…' : 'Select a deal…'}</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.title}
                {deal.total_value_usd != null
                  ? ` · ${formatUsd(deal.total_value_usd)} target`
                  : ''}
              </option>
            ))}
          </select>
          {selectedDeal ? (
            <span className="text-xs text-muted">
              Investment is earmarked for {selectedDeal.title} and credited to company capital.
            </span>
          ) : null}
        </label>

        <label className="block space-y-1.5">
          <span className="ui-label">Amount (USD)</span>
          <input
            className="ui-input max-w-xs text-lg font-semibold"
            type="number"
            min={isStripe ? '0.50' : '0.01'}
            step="0.01"
            value={amountUsd}
            onChange={(event) => setAmountUsd(event.target.value)}
            placeholder="0.00"
            required
          />
          {Number(amountUsd) > 0 && (
            <span className="text-xs text-muted">{formatUsd(Number(amountUsd))}</span>
          )}
        </label>

        <label className="block space-y-1.5">
          <span className="ui-label">Method</span>
          <select
            className="ui-input"
            value={method}
            onChange={(event) => setMethod(event.target.value as InvestmentMethod)}
          >
            {METHODS.map((value) => (
              <option key={value} value={value}>
                {investmentMethodLabel(value)}
              </option>
            ))}
          </select>
        </label>

        {!isStripe && (
          <label className="block space-y-1.5">
            <span className="ui-label">Payment reference</span>
            <input
              className="ui-input"
              type="text"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Bank or MoMo transaction reference"
              required
            />
          </label>
        )}

        <label className="block space-y-1.5">
          <span className="ui-label">Notes (optional)</span>
          <textarea
            className="ui-input min-h-20"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional note for this investment"
          />
        </label>

        <Button type="submit" disabled={isSubmitting || dealsLoading || deals.length === 0}>
          {isSubmitting
            ? isStripe
              ? 'Redirecting to Stripe…'
              : 'Submitting…'
            : isStripe
              ? 'Pay with card'
              : 'Submit for confirmation'}
        </Button>
      </form>
    </Card>
  )
}
