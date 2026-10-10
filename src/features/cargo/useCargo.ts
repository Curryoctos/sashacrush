import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminNextCargoStatus,
  cargoObjectPath,
  validateCargoDocument,
  validateCreateCargoShipment,
  type CreateCargoShipmentInput,
} from '@/features/cargo/validation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  CARGO_APPROVAL_COLUMNS,
  CARGO_BUCKET,
  CARGO_DOCUMENT_COLUMNS,
  CARGO_SHIPMENT_COLUMNS,
  type CargoApproval,
  type CargoDocument,
  type CargoShipment,
  type CargoShipmentWithMeta,
  type CargoStatus,
} from '@/types/cargo'

interface AgentOption {
  id: string
  full_name: string | null
  email: string
}

export function useCargoAgents() {
  return useQuery({
    queryKey: ['cargo-agents'],
    queryFn: async (): Promise<AgentOption[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'agent')
        .eq('is_active', true)
        .order('full_name', { ascending: true })
      if (error) {
        throw error
      }
      return data ?? []
    },
  })
}

export function useCargoShipments() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['cargo-shipments', user?.id, user?.role],
    enabled: Boolean(user) && (user?.role === 'admin' || user?.role === 'agent'),
    queryFn: async (): Promise<CargoShipmentWithMeta[]> => {
      const { data, error } = await supabase
        .from('cargo_shipments')
        .select(CARGO_SHIPMENT_COLUMNS)
        .order('expected_at', { ascending: true })

      if (error) {
        throw error
      }

      const rows = (data ?? []) as CargoShipment[]
      if (rows.length === 0) {
        return []
      }

      const assigneeIds = [...new Set(rows.map((row) => row.assignee_id).filter(Boolean))] as string[]
      const shipmentIds = rows.map((row) => row.id)

      const [{ data: agents }, { data: approvals }] = await Promise.all([
        assigneeIds.length
          ? supabase.from('users').select('id, full_name, email').in('id', assigneeIds)
          : Promise.resolve({ data: [] as AgentOption[] }),
        supabase
          .from('cargo_approvals')
          .select('shipment_id, stage')
          .in('shipment_id', shipmentIds),
      ])

      const agentMap = new Map(
        ((agents ?? []) as AgentOption[]).map((agent) => [agent.id, agent]),
      )
      const approvedByShipment = new Map<string, CargoStatus[]>()
      for (const row of approvals ?? []) {
        const list = approvedByShipment.get(row.shipment_id) ?? []
        list.push(row.stage as CargoStatus)
        approvedByShipment.set(row.shipment_id, list)
      }

      return rows.map((row) => {
        const agent = row.assignee_id ? agentMap.get(row.assignee_id) : null
        return {
          ...row,
          assignee_name: agent?.full_name ?? null,
          assignee_email: agent?.email ?? null,
          approved_stages: approvedByShipment.get(row.id) ?? [],
        }
      })
    },
  })

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['cargo-shipments'] })
  }, [queryClient])

  const createShipment = useCallback(
    async (input: CreateCargoShipmentInput): Promise<CargoShipment> => {
      setActionError(null)
      if (user?.role !== 'admin' || !user.id) {
        throw new Error('Only admin can create shipments.')
      }
      const validationError = validateCreateCargoShipment(input)
      if (validationError) {
        setActionError(validationError)
        throw new Error(validationError)
      }

      const { data, error } = await supabase
        .from('cargo_shipments')
        .insert({
          origin: input.origin.trim(),
          destination: input.destination.trim(),
          description: input.description.trim(),
          expected_at: input.expectedAt,
          assignee_id: input.assigneeId || null,
          created_by: user.id,
          status: 'ordered',
        })
        .select(CARGO_SHIPMENT_COLUMNS)
        .single()

      if (error || !data) {
        const message = error?.message ?? 'Could not create shipment.'
        setActionError(message)
        throw new Error(message)
      }

      await refresh()
      return data as CargoShipment
    },
    [refresh, user?.id, user?.role],
  )

  const advanceStatus = useCallback(
    async (shipment: CargoShipment): Promise<void> => {
      setActionError(null)
      if (user?.role !== 'admin') {
        throw new Error('Only admin can advance shipment status.')
      }
      const next = adminNextCargoStatus(shipment.status)
      if (!next) {
        throw new Error('Shipment is already delivered.')
      }
      const { error } = await supabase
        .from('cargo_shipments')
        .update({ status: next })
        .eq('id', shipment.id)
        .eq('status', shipment.status)
      if (error) {
        setActionError(error.message)
        throw error
      }
      await refresh()
    },
    [refresh, user?.role],
  )

  const assignAgent = useCallback(
    async (shipmentId: string, assigneeId: string | null): Promise<void> => {
      setActionError(null)
      if (user?.role !== 'admin') {
        throw new Error('Only admin can assign collaborators.')
      }
      const { error } = await supabase
        .from('cargo_shipments')
        .update({ assignee_id: assigneeId })
        .eq('id', shipmentId)
      if (error) {
        setActionError(error.message)
        throw error
      }
      await refresh()
    },
    [refresh, user?.role],
  )

  const approveStage = useCallback(
    async (shipment: CargoShipment, note?: string): Promise<void> => {
      setActionError(null)
      if (!user?.id || user.role !== 'agent') {
        throw new Error('Only the assigned agent can approve a stage.')
      }
      if (shipment.assignee_id !== user.id) {
        throw new Error('This shipment is not assigned to you.')
      }
      const { error } = await supabase.from('cargo_approvals').insert({
        shipment_id: shipment.id,
        stage: shipment.status,
        approver_id: user.id,
        note: note?.trim() || null,
      })
      if (error) {
        setActionError(error.message)
        throw error
      }
      await refresh()
      await queryClient.invalidateQueries({ queryKey: ['cargo-approvals', shipment.id] })
    },
    [queryClient, refresh, user?.id, user?.role],
  )

  return {
    shipments: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    error: listQuery.error,
    actionError,
    createShipment,
    advanceStatus,
    assignAgent,
    approveStage,
    refresh,
    isAdmin: user?.role === 'admin',
    userId: user?.id,
  }
}

export function useCargoDocuments(shipmentId: string | null) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const docsQuery = useQuery({
    queryKey: ['cargo-documents', shipmentId],
    enabled: Boolean(shipmentId),
    queryFn: async (): Promise<CargoDocument[]> => {
      const { data, error } = await supabase
        .from('cargo_documents')
        .select(CARGO_DOCUMENT_COLUMNS)
        .eq('shipment_id', shipmentId!)
        .order('created_at', { ascending: false })
      if (error) {
        throw error
      }
      const rows = (data ?? []) as CargoDocument[]
      const withUrls: CargoDocument[] = []
      for (const row of rows) {
        const { data: signed } = await supabase.storage
          .from(CARGO_BUCKET)
          .createSignedUrl(row.file_path, 3600)
        withUrls.push({ ...row, signed_url: signed?.signedUrl ?? null })
      }
      return withUrls
    },
  })

  const uploadDocument = useCallback(
    async (input: { shipmentId: string; title: string; file: File }) => {
      if (!user?.id || (user.role !== 'admin' && user.role !== 'agent')) {
        throw new Error('You cannot upload cargo documents.')
      }
      const validationError = validateCargoDocument(input.file, input.title)
      if (validationError) {
        throw new Error(validationError)
      }
      const path = cargoObjectPath(input.shipmentId, input.file.name)
      const { error: uploadError } = await supabase.storage
        .from(CARGO_BUCKET)
        .upload(path, input.file, { contentType: input.file.type, upsert: false })
      if (uploadError) {
        throw uploadError
      }

      const { error } = await supabase.from('cargo_documents').insert({
        shipment_id: input.shipmentId,
        uploader_id: user.id,
        title: input.title.trim(),
        file_path: path,
        mime_type: input.file.type,
        size_bytes: input.file.size,
      })

      if (error) {
        await supabase.storage.from(CARGO_BUCKET).remove([path])
        throw error
      }

      await queryClient.invalidateQueries({ queryKey: ['cargo-documents', input.shipmentId] })
    },
    [queryClient, user?.id, user?.role],
  )

  return {
    documents: docsQuery.data ?? [],
    isLoading: docsQuery.isLoading,
    error: docsQuery.error,
    uploadDocument,
  }
}

export function useCargoApprovals(shipmentId: string | null) {
  return useQuery({
    queryKey: ['cargo-approvals', shipmentId],
    enabled: Boolean(shipmentId),
    queryFn: async (): Promise<CargoApproval[]> => {
      const { data, error } = await supabase
        .from('cargo_approvals')
        .select(CARGO_APPROVAL_COLUMNS)
        .eq('shipment_id', shipmentId!)
        .order('created_at', { ascending: true })
      if (error) {
        throw error
      }
      return (data ?? []) as CargoApproval[]
    },
  })
}
