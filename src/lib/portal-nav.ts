import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Camera,
  ClipboardList,
  FileText,
  FolderKanban,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  MessageSquare,
  Package,
  PiggyBank,
  Receipt,
  Users,
  Video,
} from 'lucide-react'

export interface PortalNavItem {
  label: string
  to: string
  icon?: LucideIcon
  badge?: number
  /**
   * Highlight this drawer item when the location matches any of these paths
   * (exact or nested). Use for hub parents that own several leaf routes.
   */
  activeFor?: string[]
}

export interface PortalNavSection {
  /** Optional section label shown above the group in the drawer. */
  label?: string
  items: PortalNavItem[]
}

/** Admin: related leaf routes are grouped under hub parents (FolderCards). */
export const ADMIN_NAV: PortalNavSection[] = [
  {
    items: [
      { label: 'Overview', to: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Users', to: '/admin/users', icon: Users },
      {
        label: 'Projects',
        to: '/admin/projects',
        icon: FolderKanban,
        activeFor: [
          '/admin/projects',
          '/admin/funding',
          '/admin/land-records',
          '/admin/deals',
        ],
      },
      { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Libraries',
    items: [
      {
        label: 'Media',
        to: '/admin/media-hub',
        icon: Video,
        activeFor: ['/admin/media-hub', '/admin/photos', '/admin/media'],
      },
      {
        label: 'Documents',
        to: '/admin/documents-hub',
        icon: FileText,
        activeFor: [
          '/admin/documents-hub',
          '/admin/documents',
          '/admin/investor-documents',
        ],
      },
    ],
  },
  {
    label: 'Money',
    items: [
      {
        label: 'Finance',
        to: '/admin/finance',
        icon: Landmark,
        activeFor: [
          '/admin/finance',
          '/admin/payments',
          '/admin/capital',
          '/admin/wallet',
        ],
      },
    ],
  },
  {
    label: 'Ops',
    items: [
      {
        label: 'Pipeline',
        to: '/admin/pipeline',
        icon: Package,
        activeFor: [
          '/admin/pipeline',
          '/admin/suggestions',
          '/admin/community',
          '/admin/cargo',
        ],
      },
      { label: 'Messages', to: '/admin/chat', icon: MessageSquare },
      { label: 'Audit Log', to: '/admin/audit-log', icon: ClipboardList },
    ],
  },
]

export const SELLER_NAV: PortalNavSection[] = [
  {
    items: [
      { label: 'Overview', to: '/seller/dashboard', icon: LayoutDashboard },
      { label: 'Messages', to: '/seller/chat', icon: MessageSquare },
      { label: 'Documents', to: '/seller/documents', icon: FileText },
      { label: 'Receipts', to: '/seller/receipts', icon: Receipt },
      { label: 'Photos', to: '/seller/photos', icon: Camera },
    ],
  },
]

export const AGENT_NAV: PortalNavSection[] = [
  {
    items: [
      { label: 'Overview', to: '/agent/dashboard', icon: LayoutDashboard },
      { label: 'Land Records', to: '/agent/land-records', icon: FolderKanban },
      { label: 'Analytics', to: '/agent/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Work',
    items: [
      {
        label: 'Paperwork',
        to: '/agent/paperwork',
        icon: FileText,
        activeFor: ['/agent/paperwork', '/agent/documents', '/agent/receipts'],
      },
      {
        label: 'Capital',
        to: '/agent/capital',
        icon: PiggyBank,
        activeFor: [
          '/agent/capital',
          '/agent/projects',
          '/agent/investments',
          '/agent/agreements',
        ],
      },
      { label: 'Field Photos', to: '/agent/photos', icon: Camera },
      { label: 'Suggestions', to: '/agent/suggestions', icon: Lightbulb },
      { label: 'Cargo', to: '/agent/cargo', icon: Package },
    ],
  },
  {
    items: [{ label: 'Messages', to: '/agent/chat', icon: MessageSquare }],
  },
]

export const EXECUTIVE_NAV: PortalNavSection[] = [
  {
    items: [
      { label: 'Overview', to: '/executive/dashboard', icon: LayoutDashboard },
      {
        label: 'Portfolio',
        to: '/executive/portfolio',
        icon: FolderKanban,
        activeFor: [
          '/executive/portfolio',
          '/executive/deals',
          '/executive/funding',
        ],
      },
      { label: 'Analytics', to: '/executive/analytics', icon: BarChart3 },
      { label: 'Communications', to: '/executive/communications', icon: MessageSquare },
      { label: 'Media', to: '/executive/media', icon: Video },
    ],
  },
]

/** Current drawer label for the active route (top-bar wayfinding). */
export function findActiveNavLabel(
  sections: PortalNavSection[],
  pathname: string,
): string | null {
  for (const section of sections) {
    for (const item of section.items) {
      if (isDrawerItemActive(pathname, item)) {
        return item.label
      }
    }
  }
  return null
}

export function pathMatches(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`)
}

export function isDrawerItemActive(pathname: string, item: PortalNavItem): boolean {
  if (item.activeFor?.some((base) => pathMatches(pathname, base))) {
    return true
  }
  return pathMatches(pathname, item.to)
}

/** Map every nav item (preserves section structure). */
export function mapNavSections(
  sections: PortalNavSection[],
  mapItem: (item: PortalNavItem) => PortalNavItem,
): PortalNavSection[] {
  return sections.map((section) => ({
    ...section,
    items: section.items.map(mapItem),
  }))
}
