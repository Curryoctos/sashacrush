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
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="ui-field-row">
        <Field label="Title" error={fieldErrors.title} required>
          <input
            value={form.title}
            onChange={(e) => onChange('title', e.target.value)}
            className={inputClass(fieldErrors.title)}
            placeholder="Mubende parcel A"
          />
        </Field>

        <Field label="Location" error={fieldErrors.location} required>
          <input
            value={form.location}
            onChange={(e) => onChange('location', e.target.value)}
            className={inputClass(fieldErrors.location)}
            placeholder="District, region"
          />
        </Field>
      </div>

      <div className="ui-field-row">
        <Field label="Total value (USD)" error={fieldErrors.total_value_usd} required>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.total_value_usd}
            onChange={(e) => onChange('total_value_usd', e.target.value)}
            className={inputClass(fieldErrors.total_value_usd)}
            placeholder="0.00"
          />
        </Field>

        <Field label="Assigned seller" hint="Optional — seller sees this deal in their portal.">
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
      </div>

      <div className="ui-field-row-3">
        <Field label="Latitude" error={fieldErrors.latitude}>
          <input
            value={form.latitude}
            onChange={(e) => onChange('latitude', e.target.value)}
            className={inputClass(fieldErrors.latitude)}
            placeholder="0.000000"
          />
        </Field>

        <Field label="Longitude" error={fieldErrors.longitude}>
          <input
            value={form.longitude}
            onChange={(e) => onChange('longitude', e.target.value)}
            className={inputClass(fieldErrors.longitude)}
            placeholder="0.000000"
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
      </div>

      <Field label="Description" hint="Shown on deal overview and maps.">
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => onChange('description', e.target.value)}
          className={inputClass()}
          placeholder="Boundaries, access notes, acreage…"
        />
      </Field>

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

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/80 pt-4">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSaving} size="lg">
          {isSaving
            ? 'Saving…'
            : mode === 'create'
              ? 'Create land record'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="ui-field">
      <span className="ui-label">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
      {hint && !error ? <span className="ui-hint">{hint}</span> : null}
      {error ? (
        <span className="text-xs font-semibold text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

function inputClass(hasError?: string) {
  return `ui-input ${hasError ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`
}
