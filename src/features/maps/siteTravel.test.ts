import { describe, expect, it } from 'vitest'
import { googleMapsDirectionsUrl, uberDropoffUrl } from '@/features/maps/siteTravel'

describe('site travel links', () => {
  const destination = {
    latitude: 0.5605,
    longitude: 31.395,
    label: 'Mubende Land',
  }

  it('builds an Uber dropoff deep link with the land coordinates', () => {
    const url = new URL(uberDropoffUrl(destination))
    expect(url.origin + url.pathname).toBe('https://m.uber.com/ul/')
    expect(url.searchParams.get('action')).toBe('setPickup')
    expect(url.searchParams.get('pickup')).toBe('my_location')
    expect(url.searchParams.get('dropoff[latitude]')).toBe('0.5605')
    expect(url.searchParams.get('dropoff[longitude]')).toBe('31.395')
    expect(url.searchParams.get('dropoff[nickname]')).toBe('Mubende Land')
  })

  it('builds Google Maps driving directions to the same point', () => {
    const url = new URL(googleMapsDirectionsUrl(destination))
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('destination')).toBe('0.5605,31.395')
    expect(url.searchParams.get('travelmode')).toBe('driving')
  })
})
