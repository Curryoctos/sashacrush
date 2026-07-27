import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import type { LandRecordFormValues, LandRecordStatus, SellerOption } from '@/types/database'

interface LandRecordFormProps {
  form: LandRecordFormValues
  fieldErrors: Partial<Record<keyof LandRecordFormValues, string>>
  sellers: SellerOption[]
  mode: 'create' | 'edit'
  isSaving: boolean
  formError: string | null
  formSuccess: string | null
  onChange: <K extends keyof LandRecordFormValues>(
    key: K,
    value: LandRecordFormValues[K],
  ) => void
  onSubmit: () => void
  onCancel?: () => void
}

export function LandRecordForm({
  form,
  fieldErrors,
  sellers,
  mode,
  isSaving,
  formError,
  formSuccess,
  onChange,
  onSubmit,
  onCancel,
}: LandRecordFormProps) {
  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <Field label="Title *" error={fieldErrors.title}>
        <input
          value={form.title}
          onChange={(e) => onChange('title', e.target.value)}
          className={inputClass(fieldErrors.title)}
        />
      </Field>

      <Field label="Location *" error={fieldErrors.location}>
        <input
          value={form.location}
          onChange={(e) => onChange('location', e.target.value)}
          className={inputClass(fieldErrors.location)}
        />
      </Field>

      <Field label="Total value (USD) *" error={fieldErrors.total_value_usd}>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.total_value_usd}
          onChange={(e) => onChange('total_value_usd', e.target.value)}
          className={inputClass(fieldErrors.total_value_usd)}
        />
      </Field>

      <Field label="Assigned seller">
        <select
          value={form.seller_id}
          onChange={(e) => onChange('seller_id', e.target.value)}
          className={inputClass()}
        >
          <option value="">Unassigned</option>
          {sellers.map((seller) => (
            <option key={seller.id} value={seller.id}>
              {seller.full_name ?? seller.email}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Latitude" error={fieldErrors.latitude}>
        <input
          value={form.latitude}
          onChange={(e) => onChange('latitude', e.target.value)}
          className={inputClass(fieldErrors.latitude)}
        />
      </Field>

      <Field label="Longitude" error={fieldErrors.longitude}>
        <input
          value={form.longitude}
          onChange={(e) => onChange('longitude', e.target.value)}
          className={inputClass(fieldErrors.longitude)}
        />
      </Field>

      <Field label="Status">
        <select
          value={form.status}
          onChange={(e) => onChange('status', e.target.value as LandRecordStatus)}
          className={inputClass()}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </Field>

      <div className="md:col-span-2">
        <Field label="Description">
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => onChange('description', e.target.value)}
            className={inputClass()}
          />
        </Field>
      </div>

      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSaving}>
          {isSaving
            ? 'Saving…'
            : mode === 'create'
              ? 'Create land record'
              : 'Save changes'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {formError && (
          <p className="ui-alert-danger" role="alert">
            {formError}
          </p>
        )}
        {formSuccess && (
          <p className="ui-alert-success" role="status">
            {formSuccess}
          </p>
        )}
      </div>
    </form>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="ui-label">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error && (
        <span className="mt-1 block text-xs text-danger" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

function inputClass(hasError?: string) {
  return `ui-input ${hasError ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`
}
