import {
  googleMapsDirectionsUrl,
  uberDropoffUrl,
  type SiteDestination,
} from '@/features/maps/siteTravel'

const uberClassName =
  'rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/90'
const mapsClassName =
  'rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-ink'

/** Uber dropoff + Open in maps — same actions as LandMapPanel on agent/admin. */
export function SiteTravelLinks({
  destination,
  className = 'contents',
  compact = false,
}: {
  destination: SiteDestination
  className?: string
  /** Tighter links for map popups */
  compact?: boolean
}) {
  const uber = compact
    ? 'text-xs font-medium text-ink underline'
    : uberClassName
  const maps = compact
    ? 'text-xs font-medium text-ink underline'
    : mapsClassName

  return (
    <div className={className}>
      <a href={uberDropoffUrl(destination)} target="_blank" rel="noreferrer" className={uber}>
        Get Uber to this site
      </a>
      <a
        href={googleMapsDirectionsUrl(destination)}
        target="_blank"
        rel="noreferrer"
        className={maps}
      >
        Open in maps
      </a>
    </div>
  )
}
