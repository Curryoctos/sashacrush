export interface CommunityMember {
  id: string
  user_id: string
  display_name: string
  location: string | null
  bio: string | null
  created_at: string
}

export interface CommunityPost {
  id: string
  author_user_id: string
  parent_id: string | null
  body: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface CommunityPostWithMeta extends CommunityPost {
  author_name: string
  replies: CommunityPostWithMeta[]
}

export interface IncubationEvent {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  location: string | null
  created_by: string | null
  created_at: string
}

export const COMMUNITY_POST_COLUMNS =
  'id, author_user_id, parent_id, body, is_pinned, created_at, updated_at'

export const INCUBATION_EVENT_COLUMNS =
  'id, title, description, starts_at, ends_at, location, created_by, created_at'
