import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { extractEdgeFunctionError } from '@/lib/edgeFunctionError'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types'

export interface ManagedUser {
  id: string
  email: string
  role: UserRole
  full_name: string | null
  is_active: boolean
  created_at: string
  updated_at?: string
}

export type ManageUsersAction = 'create' | 'update' | 'set_active' | 'send_access'

export interface CreateUserInput {
  email: string
  role: UserRole
  fullName?: string
  sendInvite?: boolean
}

export interface UpdateUserInput {
  userId: string
  fullName?: string | null
  role?: UserRole
}

export interface SetActiveInput {
  userId: string
  isActive: boolean
}

async function invokeManageUsers(
  body: Record<string, unknown>,
): Promise<{ user?: ManagedUser }> {
  const { data, error } = await supabase.functions.invoke('admin-manage-users', {
    body,
  })

  const message = await extractEdgeFunctionError(
    error,
    data,
    'Could not complete user management action.',
  )

  if (error || (data && typeof data === 'object' && 'error' in data && data.error)) {
    throw new Error(message)
  }

  return (data ?? {}) as { user?: ManagedUser }
}

export function useManagedUsers(roleFilter: UserRole | 'all') {
  return useQuery({
    queryKey: ['admin-users', roleFilter],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select('id, email, role, full_name, is_active, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter)
      }

      const { data, error } = await query
      if (error) {
        throw error
      }
      return (data ?? []) as ManagedUser[]
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateUserInput) =>
      invokeManageUsers({
        action: 'create',
        email: input.email,
        role: input.role,
        fullName: input.fullName,
        sendInvite: input.sendInvite ?? true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateUserInput) =>
      invokeManageUsers({
        action: 'update',
        userId: input.userId,
        fullName: input.fullName,
        role: input.role,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export function useSetUserActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SetActiveInput) =>
      invokeManageUsers({
        action: 'set_active',
        userId: input.userId,
        isActive: input.isActive,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export function useSendUserAccess() {
  return useMutation({
    mutationFn: (userId: string) =>
      invokeManageUsers({
        action: 'send_access',
        userId,
      }),
  })
}
