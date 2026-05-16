import { describe, it, expect } from 'vitest'
import { googleMapsUrl } from '@/lib/maps-url'

describe('googleMapsUrl', () => {
  it('pairs place_id with lat,lng so the Maps app resolves the pin', () => {
    // The mobile Maps app treats `q=place_id:XYZ` as a literal search and
    // shows "place not found"; the api=1 + query_place_id form resolves
    // correctly because the place_id is honored as a structured param.
    const url = googleMapsUrl({
      google_place_id: 'ChIJabc123',
      lat: 35.6586,
      lng: 139.7454,
      address: 'Tokyo Tower',
    })
    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=35.6586,139.7454&query_place_id=ChIJabc123'
    )
  })

  it('falls back to address as the query when coords are missing', () => {
    const url = googleMapsUrl({
      google_place_id: 'ChIJabc123',
      address: 'Tokyo Tower, Minato',
    })
    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=Tokyo%20Tower%2C%20Minato&query_place_id=ChIJabc123'
    )
  })

  it('uses lat,lng alone when there is no place_id', () => {
    const url = googleMapsUrl({ lat: 35.0, lng: 139.0 })
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=35,139')
  })

  it('uses address alone when there is no place_id or coords', () => {
    const url = googleMapsUrl({ address: '1 Chome, Shibuya' })
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=1%20Chome%2C%20Shibuya')
  })

  it('drops a place_id with no query target rather than returning a broken link', () => {
    // place_id alone in the api=1 format would render an empty query, which
    // the Maps app rejects. Returning null lets the caller hide the link.
    expect(googleMapsUrl({ google_place_id: 'ChIJabc123' })).toBeNull()
  })

  it('returns null when nothing is provided', () => {
    expect(googleMapsUrl({})).toBeNull()
  })
})
