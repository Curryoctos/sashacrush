export interface PortalNavItem {
  label: string
  to: string
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
      { label: 'Dashboard', to: '/admin/dashboard' },
      { label: 'Users', to: '/admin/users' },
      { label: 'Land Records', to: '/admin/land-records' },
      { label: 'Analytics', to: '/admin/analytics' },
    ],
  },
  {
    label: 'Libraries',
    items: [
      {
        label: 'Media',
        to: '/admin/media-hub',
        activeFor: ['/admin/media-hub', '/admin/photos', '/admin/media'],
      },
      {
        label: 'Documents',
        to: '/admin/documents-hub',
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
        activeFor: [
          '/admin/pipeline',
          '/admin/suggestions',
          '/admin/community',
          '/admin/cargo',
        ],
      },
      { label: 'Messages', to: '/admin/chat' },
      { label: 'Audit Log', to: '/admin/audit-log' },
    ],
  },
]

export const SELLER_NAV: PortalNavSection[] = [
  {
    items: [
      { label: 'Dashboard', to: '/seller/dashboard' },
      { label: 'Messages', to: '/seller/chat' },
      { label: 'Documents', to: '/seller/documents' },
      { label: 'Receipts', to: '/seller/receipts' },
      { label: 'Photos', to: '/seller/photos' },
    ],
  },
]

export const AGENT_NAV: PortalNavSection[] = [
  {
    items: [
      { label: 'Dashboard', to: '/agent/dashboard' },
      { label: 'Land Records', to: '/agent/land-records' },
      { label: 'Analytics', to: '/agent/analytics' },
    ],
  },
  {
    label: 'Work',
    items: [
      {
        label: 'Paperwork',
        to: '/agent/paperwork',
        activeFor: ['/agent/paperwork', '/agent/documents', '/agent/receipts'],
      },
      {
        label: 'Capital',
        to: '/agent/capital',
        activeFor: ['/agent/capital', '/agent/investments', '/agent/agreements'],
      },
      { label: 'Field Photos', to: '/agent/photos' },
      { label: 'Suggestions', to: '/agent/suggestions' },
      { label: 'Cargo', to: '/agent/cargo' },
    ],
  },
  {
    items: [{ label: 'Messages', to: '/agent/chat' }],
  },
]

export const EXECUTIVE_NAV: PortalNavSection[] = [
  {
    items: [
      { label: 'Dashboard', to: '/executive/dashboard' },
      { label: 'Portfolio', to: '/executive/deals' },
      { label: 'Analytics', to: '/executive/analytics' },
      { label: 'Communications', to: '/executive/communications' },
      { label: 'Media', to: '/executive/media' },
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
