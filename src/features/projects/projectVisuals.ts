import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  Folder,
  GraduationCap,
  Heart,
  Leaf,
  MapPin,
  Package,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import type { BadgeTone } from '@/components/ui/Badge'
import type { ProjectStatus, ProjectType } from '@/types/projects'

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  land_acquisition: 'Land',
  infrastructure: 'Infrastructure',
  community_cause: 'Community',
  cargo_import: 'Cargo',
  investment: 'Investment',
  agriculture: 'Agriculture',
  education: 'Education',
  sports: 'Sports',
  other: 'Other',
}

export const PROJECT_TYPE_ICON: Record<ProjectType, LucideIcon> = {
  land_acquisition: MapPin,
  infrastructure: Building2,
  community_cause: Heart,
  cargo_import: Package,
  investment: TrendingUp,
  agriculture: Leaf,
  education: GraduationCap,
  sports: Trophy,
  other: Folder,
}

/** Neutral surface gradients using ink/canvas tokens — dark-mode safe. */
export const PROJECT_TYPE_SURFACE: Record<ProjectType, string> = {
  land_acquisition: 'bg-surface text-ink',
  infrastructure: 'bg-surface text-ink',
  community_cause: 'bg-surface text-ink',
  cargo_import: 'bg-surface text-ink',
  investment: 'bg-surface text-ink',
  agriculture: 'bg-surface text-ink',
  education: 'bg-surface text-ink',
  sports: 'bg-surface text-ink',
  other: 'bg-surface text-ink',
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  funded: 'Funded',
  in_progress: 'In progress',
  completed: 'Completed',
  on_hold: 'On hold',
  cancelled: 'Cancelled',
}

export function projectStatusTone(status: ProjectStatus): BadgeTone {
  if (status === 'active' || status === 'completed' || status === 'funded') {
    return 'success'
  }
  if (status === 'cancelled') return 'danger'
  if (status === 'on_hold' || status === 'draft' || status === 'in_progress') {
    return 'warning'
  }
  return 'neutral'
}
