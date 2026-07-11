import { notifySellerAssigned } from '@/features/land-records/notify'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'
import {
  emptyLandRecordForm,
  formToLandRecordPayload,
  formatUsd,
  landRecordToForm,
  validateLandRecordForm,
} from '@/lib/land-records'
import { supabase } from '@/lib/supabase'
import type {
  LandRecord,
  LandRecordFormValues,
  LandRecordStatus,
  SellerOption,
} from '@/types/database'

const LAND_RECORD_COLUMNS =
  'id, title, description, location, total_value_usd, seller_id, latitude, longitude, status, created_at'

export function AdminLandRecordsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<LandRecordFormValues>(emptyLandRecordForm())
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof LandRecordFormValues, string>>
  >({})
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [previousSellerId, setPreviousSellerId] = useState<string | null>(null)

  const landRecordsQuery = useQuery({
    queryKey: ['land-records', 'admin'],
    queryFn: async (): Promise<LandRecord[]> => {
      const { data, error } = await supabase
        .from('land_records')
        .select(LAND_RECORD_COLUMNS)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return (data ?? []) as LandRecord[]
    },
  })

  const sellersQuery = useQuery({
    queryKey: ['users', 'sellers'],
    queryFn: async (): Promise<SellerOption[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'seller')
        .order('email')

      if (error) {
        throw error
      }

      return data ?? []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validation = validateLandRecordForm(form)
      setFieldErrors(validation)
      if (Object.keys(validation).length > 0) {
        throw new Error('Please fix the highlighted fields.')
      }

      const payload = formToLandRecordPayload(form)

      if (mode === 'create') {
        const { data, error } = await supabase
          .from('land_records')
          .insert(payload)
          .select('id')
          .single()

        if (error) {
          throw error
        }

        if (payload.seller_id && data?.id) {
          void notifySellerAssigned(data.id, payload.seller_id)
        }

        return
      }

      if (!editingId) {
        throw new Error('No land record selected for editing.')
      }

      const { error } = await supabase
        .from('land_records')
        .update(payload)
        .eq('id', editingId)

      if (error) {
        throw error
      }

      if (
        payload.seller_id &&
        payload.seller_id !== previousSellerId
      ) {
        void notifySellerAssigned(editingId, payload.seller_id)

        await supabase
          .from('documents')
          .update({ assigned_to: payload.seller_id })
          .eq('land_id', editingId)
          .eq('status', 'sent')
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['land-records'] })
      setFormError(null)
      setFieldErrors({})
      setFormSuccess(
        mode === 'create'
          ? 'Land record created successfully.'
          : 'Land record updated successfully.',
      )
      resetForm()
    },
    onError: (error: Error) => {
      setFormSuccess(null)
      setFormError(formatSupabaseError(error))
    },
  })

  const sellerLabel = (sellerId: string | null) => {
    if (!sellerId) {
      return 'Unassigned'
    }
    const seller = sellersQuery.data?.find((s) => s.id === sellerId)
    return seller?.full_name ?? seller?.email ?? 'Unknown seller'
  }

  const resetForm = () => {
    setMode('create')
    setEditingId(null)
    setForm(emptyLandRecordForm())
    setFieldErrors({})
  }

  const startEdit = (record: LandRecord) => {
    setMode('edit')
    setEditingId(record.id)
    setPreviousSellerId(record.seller_id)
    setForm(landRecordToForm(record))
    setFormError(null)
    setFormSuccess(null)
    setFieldErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const updateField = <K extends keyof LandRecordFormValues>(
    key: K,
    value: LandRecordFormValues[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
    setFormError(null)
    setFormSuccess(null)
  }

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted">
              <Link to="/admin/dashboard" className="text-brand-700 hover:underline">
                ← Admin Dashboard
              </Link>
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">Land Records</h1>
            <p className="mt-1 text-sm text-muted">Signed in as {user?.email}</p>
          </div>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50"
            >
              Cancel edit
            </button>
          )}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">
            {mode === 'create' ? 'Create New Land Record' : 'Edit Land Record'}
          </h2>
          <form
            className="mt-6 grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              saveMutation.mutate()
            }}
          >
            <Field label="Title *" error={fieldErrors.title}>
              <input
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                className={inputClass(fieldErrors.title)}
              />
            </Field>

            <Field label="Location *" error={fieldErrors.location}>
              <input
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                className={inputClass(fieldErrors.location)}
              />
            </Field>

            <Field label="Total value (USD) *" error={fieldErrors.total_value_usd}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.total_value_usd}
                onChange={(e) => updateField('total_value_usd', e.target.value)}
                className={inputClass(fieldErrors.total_value_usd)}
              />
            </Field>

            <Field label="Assigned seller">
              <select
                value={form.seller_id}
                onChange={(e) => updateField('seller_id', e.target.value)}
                className={inputClass()}
              >
                <option value="">Unassigned</option>
                {sellersQuery.data?.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.full_name ?? seller.email}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Latitude" error={fieldErrors.latitude}>
              <input
                value={form.latitude}
                onChange={(e) => updateField('latitude', e.target.value)}
                className={inputClass(fieldErrors.latitude)}
              />
            </Field>

            <Field label="Longitude" error={fieldErrors.longitude}>
              <input
                value={form.longitude}
                onChange={(e) => updateField('longitude', e.target.value)}
                className={inputClass(fieldErrors.longitude)}
              />
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  updateField('status', e.target.value as LandRecordStatus)
                }
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
                  onChange={(e) => updateField('description', e.target.value)}
                  className={inputClass()}
                />
              </Field>
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {saveMutation.isPending
                  ? 'Saving…'
                  : mode === 'create'
                    ? 'Create land record'
                    : 'Save changes'}
              </button>
              {formError && (
                <p className="text-sm text-red-700" role="alert">
                  {formError}
                </p>
              )}
              {formSuccess && (
                <p className="text-sm text-brand-700" role="status">
                  {formSuccess}
                </p>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">All land records</h2>

          {landRecordsQuery.isLoading && (
            <p className="mt-4 text-sm text-muted">Loading land records…</p>
          )}

          {landRecordsQuery.error && (
            <p className="mt-4 text-sm text-red-700" role="alert">
              {formatSupabaseError(landRecordsQuery.error as Error)}
            </p>
          )}

          {landRecordsQuery.data && landRecordsQuery.data.length === 0 && (
            <p className="mt-4 text-sm text-muted">No land records yet.</p>
          )}

          {landRecordsQuery.data && landRecordsQuery.data.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-3 font-medium">Title</th>
                    <th className="px-3 py-3 font-medium">Location</th>
                    <th className="px-3 py-3 font-medium">Value (USD)</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Seller</th>
                    <th className="px-3 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {landRecordsQuery.data.map((record) => (
                    <tr key={record.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-medium text-ink">{record.title}</td>
                      <td className="px-3 py-3 text-muted">{record.location}</td>
                      <td className="px-3 py-3">{formatUsd(record.total_value_usd)}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="px-3 py-3 text-muted">{sellerLabel(record.seller_id)}</td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          to={`/admin/deals/${record.id}`}
                          className="mr-3 text-sm font-medium text-brand-700 hover:text-brand-900"
                        >
                          Deal
                        </Link>
                        <button
                          type="button"
                          onClick={() => startEdit(record)}
                          className="text-sm font-medium text-brand-700 hover:text-brand-900"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
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
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-1">{children}</div>
      {error && (
        <span className="mt-1 block text-xs text-red-700" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

function inputClass(hasError?: string) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
    hasError ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-brand-500'
  }`
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'active'
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-700'
      }`}
    >
      {status}
    </span>
  )
}
