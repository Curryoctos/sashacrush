import type { UserRole } from '@/types/auth'
import type { Json } from '@/types/database'

export type ProjectType =
  | 'land_acquisition'
  | 'infrastructure'
  | 'community_cause'
  | 'cargo_import'
  | 'investment'
  | 'agriculture'
  | 'education'
  | 'sports'
  | 'other'

export type ProjectStatus =
  | 'draft'
  | 'active'
  | 'funded'
  | 'in_progress'
  | 'completed'
  | 'on_hold'
  | 'cancelled'

export type ParticipantRole =
  | 'investor'
  | 'contributor'
  | 'counterpart'
  | 'follower'
  | 'collaborator'

export type UpdateType =
  | 'general'
  | 'milestone'
  | 'funding'
  | 'photo'
  | 'document'
  | 'shipment'
  | 'completion'

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'

export type ProjectVisibility = 'public' | 'private'

/** Lightweight user shape for joined participant / author queries. */
export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
}

export interface Project {
  id: string
  title: string
  slug: string
  description: string
  cause: string | null
  type: ProjectType
  created_by: string | null
  owner_id: string | null
  visibility: ProjectVisibility
  funding_goal_usd: number | null
  funding_raised_usd: number
  min_contribution_usd: number
  location_name: string | null
  country: string
  latitude: number | null
  longitude: number | null
  boundary_geojson: Json | null
  start_date: string | null
  target_date: string | null
  completed_date: string | null
  status: ProjectStatus
  cover_image_path: string | null
  tags: string[]
  external_links: Json
  /** Linked land deal workspace (typically for land_acquisition). */
  land_id: string | null
  created_at: string
  updated_at: string
}

export interface ProjectParticipant {
  id: string
  project_id: string
  user_id: string
  role: ParticipantRole
  invited_by: string | null
  joined_at: string
  notes: string | null
  profile?: UserProfile
}

export interface ProjectUpdate {
  id: string
  project_id: string
  author_id: string
  title: string
  body: string
  update_type: UpdateType
  is_public: boolean
  created_at: string
  author?: UserProfile
}

export interface ProjectMilestone {
  id: string
  project_id: string
  title: string
  description: string | null
  target_date: string | null
  completed_date: string | null
  status: MilestoneStatus
  order_index: number
  created_at: string
}

export interface Payment {
  id: string
  land_id?: string | null
  project_id: string
  disbursement_reason: string
  amount_usd: number
  amount_ugx: number | null
  status: string
  created_at: string
}

export interface Receipt {
  id: string
  payment_id: string
  project_id?: string | null
  seller_id: string
  receipt_number: string
  pdf_path: string | null
  created_at: string
}

export interface Saving {
  id: string
  land_id?: string | null
  project_id?: string | null
  amount_usd: number
  created_at: string
}

export const PROJECT_TYPES: ProjectType[] = [
  'land_acquisition',
  'infrastructure',
  'community_cause',
  'cargo_import',
  'investment',
  'agriculture',
  'education',
  'sports',
  'other',
]

export const PROJECT_STATUSES: ProjectStatus[] = [
  'draft',
  'active',
  'funded',
  'in_progress',
  'completed',
  'on_hold',
  'cancelled',
]

export const PARTICIPANT_ROLES: ParticipantRole[] = [
  'investor',
  'contributor',
  'counterpart',
  'follower',
  'collaborator',
]

export const UPDATE_TYPES: UpdateType[] = [
  'general',
  'milestone',
  'funding',
  'photo',
  'document',
  'shipment',
  'completion',
]

export function isProjectType(value: string): value is ProjectType {
  return (PROJECT_TYPES as string[]).includes(value)
}

export function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as string[]).includes(value)
}
