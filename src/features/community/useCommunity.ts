import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  nestCommunityPosts,
  validateCommunityPostBody,
  validateCommunityRegister,
} from '@/features/community/validation'
import { useAuth } from '@/hooks/useAuth'
import { extractEdgeFunctionError } from '@/lib/edgeFunctionError'
import { supabase } from '@/lib/supabase'
import {
  COMMUNITY_POST_COLUMNS,
  INCUBATION_EVENT_COLUMNS,
  type CommunityMember,
  type CommunityPost,
  type CommunityPostWithMeta,
  type IncubationEvent,
} from '@/types/community'

export function useCommunityBoard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const postsQuery = useQuery({
    queryKey: ['community-posts'],
    queryFn: async (): Promise<CommunityPostWithMeta[]> => {
      const { data: posts, error } = await supabase
        .from('community_posts')
        .select(COMMUNITY_POST_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) {
        throw error
      }

      const rows = (posts ?? []) as CommunityPost[]
      const authorIds = [...new Set(rows.map((row) => row.author_user_id))]
      const names = new Map<string, string>()

      if (authorIds.length > 0) {
        const { data: members } = await supabase
          .from('community_members')
          .select('user_id, display_name')
          .in('user_id', authorIds)
        for (const member of members ?? []) {
          names.set(member.user_id, member.display_name)
        }
        const missing = authorIds.filter((id) => !names.has(id))
        if (missing.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, full_name, email')
            .in('id', missing)
          for (const person of users ?? []) {
            names.set(person.id, person.full_name ?? person.email ?? 'Member')
          }
        }
      }

      const withNames = rows.map((row) => ({
        ...row,
        author_name: names.get(row.author_user_id) ?? 'Member',
        replies: [] as CommunityPostWithMeta[],
      }))

      return nestCommunityPosts(withNames)
    },
  })

  const memberQuery = useQuery({
    queryKey: ['community-member', user?.id],
    enabled: Boolean(user?.id) && (user?.role === 'community' || user?.role === 'admin'),
    queryFn: async (): Promise<CommunityMember | null> => {
      if (!user?.id) {
        return null
      }
      const { data, error } = await supabase
        .from('community_members')
        .select('id, user_id, display_name, location, bio, created_at')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) {
        throw error
      }
      return data as CommunityMember | null
    },
  })

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['community-posts'] })
  }, [queryClient])

  const createPost = useCallback(
    async (body: string, parentId: string | null = null) => {
      const validationError = validateCommunityPostBody(body)
      if (validationError) {
        throw new Error(validationError)
      }
      if (!user?.id || (user.role !== 'community' && user.role !== 'admin')) {
        throw new Error('Sign in as a community member to post.')
      }

      const { error } = await supabase.from('community_posts').insert({
        author_user_id: user.id,
        parent_id: parentId,
        body: body.trim(),
        is_pinned: false,
      })
      if (error) {
        throw error
      }
      await refresh()
    },
    [refresh, user?.id, user?.role],
  )

  const setPinned = useCallback(
    async (postId: string, isPinned: boolean) => {
      if (user?.role !== 'admin') {
        throw new Error('Only admin can pin posts.')
      }
      const { error } = await supabase
        .from('community_posts')
        .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
        .eq('id', postId)
        .is('parent_id', null)
      if (error) {
        throw error
      }
      await refresh()
    },
    [refresh, user?.role],
  )

  const deletePost = useCallback(
    async (postId: string) => {
      if (user?.role !== 'admin') {
        throw new Error('Only admin can delete posts.')
      }
      const { error } = await supabase.from('community_posts').delete().eq('id', postId)
      if (error) {
        throw error
      }
      await refresh()
    },
    [refresh, user?.role],
  )

  return {
    posts: postsQuery.data ?? [],
    isLoading: postsQuery.isLoading,
    error: postsQuery.error,
    member: memberQuery.data ?? null,
    canPost: user?.role === 'community' || user?.role === 'admin',
    isAdmin: user?.role === 'admin',
    createPost,
    setPinned,
    deletePost,
    refresh,
  }
}

export function useIncubationSchedule() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const eventsQuery = useQuery({
    queryKey: ['incubation-events'],
    queryFn: async (): Promise<IncubationEvent[]> => {
      const { data, error } = await supabase
        .from('incubation_events')
        .select(INCUBATION_EVENT_COLUMNS)
        .gte('starts_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('starts_at', { ascending: true })
        .limit(50)
      if (error) {
        throw error
      }
      return (data ?? []) as IncubationEvent[]
    },
  })

  const createEvent = useCallback(
    async (input: {
      title: string
      description?: string
      startsAt: string
      endsAt?: string
      location?: string
    }) => {
      if (user?.role !== 'admin') {
        throw new Error('Only admin can manage the schedule.')
      }
      if (!input.title.trim() || !input.startsAt) {
        throw new Error('Title and start time are required.')
      }
      const { error } = await supabase.from('incubation_events').insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        starts_at: input.startsAt,
        ends_at: input.endsAt || null,
        location: input.location?.trim() || null,
        created_by: user.id,
      })
      if (error) {
        throw error
      }
      await queryClient.invalidateQueries({ queryKey: ['incubation-events'] })
    },
    [queryClient, user?.id, user?.role],
  )

  const deleteEvent = useCallback(
    async (eventId: string) => {
      if (user?.role !== 'admin') {
        throw new Error('Only admin can manage the schedule.')
      }
      const { error } = await supabase.from('incubation_events').delete().eq('id', eventId)
      if (error) {
        throw error
      }
      await queryClient.invalidateQueries({ queryKey: ['incubation-events'] })
    },
    [queryClient, user?.role],
  )

  return {
    events: eventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error,
    createEvent,
    deleteEvent,
    isAdmin: user?.role === 'admin',
  }
}

export async function registerCommunityMember(input: {
  email: string
  password: string
  displayName: string
  location?: string
  bio?: string
}): Promise<void> {
  const validationError = validateCommunityRegister(input)
  if (validationError) {
    throw new Error(validationError)
  }

  const { data, error } = await supabase.functions.invoke('register-community-member', {
    body: {
      email: input.email.trim(),
      password: input.password,
      displayName: input.displayName.trim(),
      location: input.location?.trim() || undefined,
      bio: input.bio?.trim() || undefined,
    },
  })

  if (error || (data && typeof data === 'object' && 'error' in data)) {
    throw new Error(
      await extractEdgeFunctionError(error, data, 'Could not register community member.'),
    )
  }
}
