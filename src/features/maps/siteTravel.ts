export interface SiteDestination {
  latitude: number
  longitude: number
  label?: string | null
}

/** Uber universal deep link — no API key. Pickup is the user's current location. */
export function uberDropoffUrl(destination: SiteDestination): string {
  const params = [
    'action=setPickup',
    'pickup=my_location',
    `dropoff[latitude]=${destination.latitude}`,
    `dropoff[longitude]=${destination.longitude}`,
  ]
  const nickname = destination.label?.trim()
  if (nickname) {
    params.push(`dropoff[nickname]=${encodeURIComponent(nickname)}`)
  }
  return `https://m.uber.com/ul/?${params.join('&')}`
}

/** Driving directions fallback when the Uber app is not installed. */
export function googleMapsDirectionsUrl(destination: SiteDestination): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.latitude},${destination.longitude}`,
    travelmode: 'driving',
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
