import { notifySellerAssigned } from '@/features/land-records/notify'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { LandRecordsBrowser } from '@/features/land-records/components/LandRecordsBrowser'
import { useAuth } from '@/hooks/useAuth'
import {
  emptyLandRecordForm,
  formToLandRecordPayload,
  landRecordToForm,
  validateLandRecordForm,
} from '@/lib/land-records'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { supabase } from '@/lib/supabase'
import type {
  LandRecord,
  LandRecordFormValues,
  SellerOption,
} from '@/types/database'

const LAND_RECORD_COLUMNS =
  'id, title, description, location, total_value_usd, seller_id, latitude, longitude, status, created_at'

const ADMIN_FOLDERS = [
  'overview',
  'documents',
  'messages',
  'payments',
  'edit',
] as const

export function AdminLandRecordsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [, setSearchParams] = useSearchParams()
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
    queryFn: async (): Promise<(LandRecord & { seller_label: string })[]> => {
      const { data, error } = await supabase
        .from('land_records')
        .select(LAND_RECORD_COLUMNS)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      const sellerIds = [
        ...new Set((data ?? []).map((land) => land.seller_id).filter(Boolean)),
      ] as string[]

      const sellerLabels = new Map<string, string>()
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase
          .from('users')
          .select('id, email, full_name')
          .in('id', sellerIds)

        for (const seller of sellers ?? []) {
          sellerLabels.set(seller.id, seller.full_name ?? seller.email)
        }
      }

      return (data ?? []).map((land) => ({
        ...(land as LandRecord),
        seller_label: land.seller_id
          ? (sellerLabels.get(land.seller_id) ?? 'Unknown seller')
          : 'Unassigned',
      }))
    },
  })

  const sellersQuery = useQuery({
    queryKey: ['users', 'sellers'],
    queryFn: async (): Promise<SellerOption[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'seller')
        .eq('is_active', true)
        .order('email')

      if (error) {
        throw error
      }

      return data ?? []
    },
  })

  const resetForm = () => {
    setMode('create')
    setEditingId(null)
    setForm(emptyLandRecordForm())
    setFieldErrors({})
    setPreviousSellerId(null)
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

        return data?.id as string | undefined
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

      if (payload.seller_id && payload.seller_id !== previousSellerId) {
        void notifySellerAssigned(editingId, payload.seller_id)

        await supabase
          .from('documents')
          .update({ assigned_to: payload.seller_id })
          .eq('land_id', editingId)
          .eq('status', 'sent')
      }

      return editingId
    },
    onSuccess: async (landId) => {
      await queryClient.invalidateQueries({ queryKey: ['land-records'] })
      await queryClient.invalidateQueries({ queryKey: ['deal-summary'] })
      setFormError(null)
      setFieldErrors({})
      setFormSuccess(
        mode === 'create'
          ? 'Land record created successfully.'
          : 'Land record updated successfully.',
      )

      if (mode === 'create' && landId) {
        resetForm()
        setSearchParams({ land: landId })
        return
      }

      if (mode === 'edit' && editingId) {
        setPreviousSellerId(form.seller_id || null)
      }
    },
    onError: (error: Error) => {
      setFormSuccess(null)
      setFormError(formatSupabaseError(error))
    },
  })

  const startEdit = (record: LandRecord) => {
    setMode('edit')
    setEditingId(record.id)
    setPreviousSellerId(record.seller_id)
    setForm(landRecordToForm(record))
    setFormError(null)
    setFormSuccess(null)
    setFieldErrors({})
  }

  const formBindings = {
    form,
    fieldErrors,
    isSaving: saveMutation.isPending,
    formError,
    formSuccess,
    onChange: updateField,
    onSubmit: () => saveMutation.mutate(),
  }

  return (
    <div className="ui-page max-w-4xl">
      <div>
        <PageBackLink to="/admin/dashboard" label="Admin Dashboard" />
        <PageHeader
          className="mt-3"
          title="Land Records"
          description={
            user?.email
              ? `Signed in as ${user.email}. Open a deal, then a folder.`
              : 'Open a deal, then a folder.'
          }
        />
      </div>

      <LandRecordsBrowser
        lands={landRecordsQuery.data ?? []}
        isLoadingLands={landRecordsQuery.isLoading}
        landsError={(landRecordsQuery.error as Error | null) ?? null}
        roleBasePath="/admin"
        folders={[...ADMIN_FOLDERS]}
        includeUnread
        canCreate
        sellers={sellersQuery.data ?? []}
        createForm={{
          ...formBindings,
          onStartCreate: () => {
            resetForm()
            setFormSuccess(null)
            setFormError(null)
          },
          onCancel: () => {
            resetForm()
            setFormSuccess(null)
            setFormError(null)
            setSearchParams({})
          },
        }}
        editForm={{
          ...formBindings,
          onStartEdit: startEdit,
        }}
        emptyTitle="No land records yet"
        emptyDescription="Create a land deal to open documents, payments, and chat."
      />
    </div>
  )
}
