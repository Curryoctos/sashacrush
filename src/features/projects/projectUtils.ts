import type { ProjectStatus, ProjectType } from '@/types/projects'
import { isProjectStatus, isProjectType } from '@/types/projects'

/** Validate project type; throws on invalid strings. */
export function assertProjectType(value: string): ProjectType {
  if (!isProjectType(value)) {
    throw new Error(`Invalid project type: ${value}`)
  }
  return value
}

const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['active', 'cancelled'],
  active: ['funded', 'in_progress', 'on_hold', 'cancelled'],
  funded: ['in_progress', 'on_hold', 'cancelled'],
  in_progress: ['completed', 'on_hold', 'cancelled'],
  completed: [],
  on_hold: ['active', 'in_progress', 'cancelled'],
  cancelled: [],
}

export function canTransitionProjectStatus(
  from: ProjectStatus,
  to: ProjectStatus,
): boolean {
  if (!isProjectStatus(from) || !isProjectStatus(to)) {
    return false
  }
  if (from === to) {
    return true
  }
  return STATUS_TRANSITIONS[from].includes(to)
}

/** URL-safe slug from title: lowercase, hyphens, strip specials. */
export function slugifyProjectTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export function fundingPercentage(raised: number, goal: number): number {
  if (!Number.isFinite(raised) || !Number.isFinite(goal) || goal <= 0) {
    return 0
  }
  return Math.round((raised / goal) * 10000) / 100
}

export async function resolveUniqueSlug(
  baseSlug: string,
  slugExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let candidate = baseSlug || 'project'
  let suffix = 2
  while (await slugExists(candidate)) {
    candidate = `${baseSlug || 'project'}-${suffix}`
    suffix += 1
  }
  return candidate
}
