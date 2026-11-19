import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { notifySuggestionStatusChanged } from '@/features/suggestions/notify'
import {
  adminNextStatuses,
  canSubmitDraft,
  validateCreateSuggestion,
  validateTransitionComment,
  type CreateSuggestionInput,
  type TransitionSuggestionInput,
} from '@/features/suggestions/validation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  SUGGESTION_COLUMNS,
  type Suggestion,
  type SuggestionComment,
  type SuggestionStatus,
  type SuggestionWithMeta,
} from '@/types/suggestions'

interface LandOption {
  id: string
  title: string
}

interface UserLite {
  id: string
  full_name: string | null
  email: string
}

export function useSuggestionLands() {
  return useQuery({
    queryKey: ['suggestion-lands'],
    queryFn: async (): Promise<LandOption[]> => {
      const { data, error } = await supabase
        .from('land_records')
        .select('id, title')
        .neq('status', 'archived')
        .order('title', { ascending: true })
      if (error) {
        throw error
      }
      return data ?? []
    },
  })
}

export function useSuggestions(statusFilter: SuggestionStatus | 'all' = 'all') {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['suggestions', statusFilter, user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<SuggestionWithMeta[]> => {
      let query = supabase
        .from('suggestions')
        .select(SUGGESTION_COLUMNS)
        .order('updated_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) {
        throw error
      }

      const rows = (data ?? []) as Suggestion[]
      if (rows.length === 0) {
        return []
      }

      const landIds = [...new Set(rows.map((row) => row.land_id))]
      const submitterIds = [...new Set(rows.map((row) => row.submitter_id))]

      const [{ data: lands }, usersResult] = await Promise.all([
        supabase.from('land_records').select('id, title').in('id', landIds),
        supabase.from('users').select('id, full_name, email').in('id', submitterIds),
      ])

      const landTitle = new Map((lands ?? []).map((land) => [land.id, land.title]))
      const submitter = new Map(
        ((usersResult.data ?? []) as UserLite[]).map((u) => [u.id, u]),
      )

      return rows.map((row) => {
        const person = submitter.get(row.submitter_id)
        return {
          ...row,
          land_title: landTitle.get(row.land_id) ?? null,
          submitter_name: person?.full_name ?? null,
          submitter_email: person?.email ?? null,
        }
      })
    },
  })

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['suggestions'] })
  }, [queryClient])

  const createSuggestion = useCallback(
    async (input: CreateSuggestionInput): Promise<Suggestion> => {
      setActionError(null)
      const validationError = validateCreateSuggestion(input)
      if (validationError) {
        setActionError(validationError)
        throw new Error(validationError)
      }
      if (!user?.id) {
        throw new Error('You must be signed in.')
      }

      const status: SuggestionStatus = input.submitNow ? 'submitted' : 'draft'
      const { data, error } = await supabase
        .from('suggestions')
        .insert({
          land_id: input.landId,
          submitter_id: user.id,
          title: input.title.trim(),
          body: input.body.trim(),
          status,
        })
        .select(SUGGESTION_COLUMNS)
        .single()

      if (error || !data) {
        const message = error?.message ?? 'Could not create suggestion.'
        setActionError(message)
        throw new Error(message)
      }

      await refresh()
      return data as Suggestion
    },
    [refresh, user?.id],
  )

  const submitDraft = useCallback(
    async (suggestion: Suggestion): Promise<void> => {
      setActionError(null)
      if (!canSubmitDraft(suggestion.status, suggestion.submitter_id, user?.id)) {
        throw new Error('Only the submitter can send a draft for review.')
      }
      const { error } = await supabase
        .from('suggestions')
        .update({ status: 'submitted' })
        .eq('id', suggestion.id)
        .eq('status', 'draft')

      if (error) {
        setActionError(error.message)
        throw error
      }
      await refresh()
    },
    [refresh, user?.id],
  )

  const transitionStatus = useCallback(
    async (input: TransitionSuggestionInput): Promise<void> => {
      setActionError(null)
      if (user?.role !== 'admin') {
        throw new Error('Only admin can change suggestion status.')
      }
      const commentError = validateTransitionComment(input.comment)
      if (commentError) {
        setActionError(commentError)
        throw new Error(commentError)
      }

      const { data: current, error: loadError } = await supabase
        .from('suggestions')
        .select(SUGGESTION_COLUMNS)
        .eq('id', input.suggestionId)
        .single()

      if (loadError || !current) {
        throw loadError ?? new Error('Suggestion not found.')
      }

      const currentStatus = current.status as SuggestionStatus
      const allowed = adminNextStatuses(currentStatus)
      if (!allowed.includes(input.nextStatus)) {
        throw new Error(`Cannot move from ${currentStatus} to ${input.nextStatus}.`)
      }

      const { error: updateError } = await supabase
        .from('suggestions')
        .update({ status: input.nextStatus })
        .eq('id', input.suggestionId)
        .eq('status', currentStatus)

      if (updateError) {
        setActionError(updateError.message)
        throw updateError
      }

      const { error: commentInsertError } = await supabase.from('suggestion_comments').insert({
        suggestion_id: input.suggestionId,
        author_id: user.id,
        body: input.comment.trim(),
        status_from: currentStatus,
        status_to: input.nextStatus,
      })

      if (commentInsertError) {
        setActionError(commentInsertError.message)
        throw commentInsertError
      }

      await notifySuggestionStatusChanged(input.suggestionId)
      await refresh()
      await queryClient.invalidateQueries({
        queryKey: ['suggestion-comments', input.suggestionId],
      })
    },
    [queryClient, refresh, user?.id, user?.role],
  )

  return {
    suggestions: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    error: listQuery.error,
    actionError,
    refresh,
    createSuggestion,
    submitDraft,
    transitionStatus,
  }
}

export function useSuggestionComments(suggestionId: string | null) {
  return useQuery({
    queryKey: ['suggestion-comments', suggestionId],
    enabled: Boolean(suggestionId),
    queryFn: async (): Promise<SuggestionComment[]> => {
      const { data, error } = await supabase
        .from('suggestion_comments')
        .select('id, suggestion_id, author_id, body, status_from, status_to, created_at')
        .eq('suggestion_id', suggestionId!)
        .order('created_at', { ascending: true })
      if (error) {
        throw error
      }
      return (data ?? []) as SuggestionComment[]
    },
  })
}
