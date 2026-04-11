import type { Database } from './database'

export type PlaceRow = Database['public']['Tables']['places']['Row']
export type PlaceInsert = Database['public']['Tables']['places']['Insert']
export type PlaceUpdate = Database['public']['Tables']['places']['Update']

// Narrowed union types for use in UI — the DB stores these as `string`
// but we constrain them at the application layer.
export type PlaceCategory = 'restaurant' | 'cafe_bar' | 'shopping' | 'attraction' | 'nature_park'
export type PlacePriority = 'must-do' | 'want-to' | 'if-time'
export type PlaceStatus = 'researching' | 'booked' | 'visited'

export const PLACE_CATEGORIES: { value: PlaceCategory; label: string; icon: string }[] = [
  { value: 'restaurant', label: 'Restaurant', icon: '🍜' },
  { value: 'cafe_bar', label: 'Cafe / Bar', icon: '☕' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'attraction', label: 'Attraction', icon: '🏯' },
  { value: 'nature_park', label: 'Nature / Park', icon: '🌿' },
]

export const PLACE_PRIORITIES: { value: PlacePriority; label: string }[] = [
  { value: 'must-do', label: 'Must do' },
  { value: 'want-to', label: 'Want to' },
  { value: 'if-time', label: 'If time' },
]

export const PLACE_STATUSES: { value: PlaceStatus; label: string }[] = [
  { value: 'researching', label: 'Researching' },
  { value: 'booked', label: 'Booked' },
  { value: 'visited', label: 'Visited' },
]

export interface GooglePlaceData {
  googlePlaceId: string
  name: string
  address: string
  lat: number
  lng: number
  rating?: number
  priceLevel?: number
  hours?: unknown
  website?: string
  phone?: string
  photos?: string[]
}
