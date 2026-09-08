import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import {
  investmentMethodLabel,
  type CreateInvestmentInput,
} from '@/features/investments/validation'
import { formatUsd } from '@/lib/formatters'
import type { InvestmentMethod } from '@/types/database'

interface InvestmentSubmitFormProps {
  isSubmitting: boolean
  onSubmit: (input: CreateInvestmentInput) => Promise<void>
}

const METHODS: InvestmentMethod[] = ['bank_transfer', 'mobile_money', 'other']

export function InvestmentSubmitForm({
  isSubmitting,
  onSubmit,
}: InvestmentSubmitFormProps) {
  const [amountUsd, setAmountUsd] = useState('')
  const [method, setMethod] = useState<InvestmentMethod>('bank_transfer')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    try {
      await onSubmit({
        amountUsd: Number(amountUsd),
        method,
        reference,
        notes: notes.trim() || null,
      })
      setAmountUsd('')
      setReference('')
      setNotes('')
      setMethod('bank_transfer')
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Could not submit investment.'
      setFormError(message)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Submit investment"
        description="Transfer funds to the company account, then record the amount and reference here for admin confirmation."
      />
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        {formError && (
          <p className="ui-alert-danger" role="alert">
            {formError}
          </p>
        )}

        <label className="block space-y-1.5">
          <span className="ui-label">Amount (USD)</span>
          <input
            className="ui-input max-w-xs text-lg font-semibold"
            type="number"
            min="0.01"
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

        <label className="block space-y-1.5">
          <span className="ui-label">Notes (optional)</span>
          <textarea
            className="ui-input min-h-20"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Any detail that helps reconcile this transfer"
          />
        </label>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Submit for confirmation'}
        </Button>
      </form>
    </Card>
  )
}
