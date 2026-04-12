import type { PlaceCategory } from '@/types/places'

// Create a Map ID at: console.cloud.google.com → Google Maps Platform → Map Management
// Required for AdvancedMarker support.
export const GOOGLE_MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID as string | undefined

// Default view — Honshu corridor from Osaka to Tokyo, all hotels visible
export const JAPAN_CENTER = { lat: 35.4, lng: 137.0 }
export const JAPAN_DEFAULT_ZOOM = 8

// Category colors for map markers
export const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  restaurant: '#ef4444', // red
  cafe_bar: '#f97316', // orange
  shopping: '#8b5cf6', // purple
  attraction: '#3b82f6', // blue
  nature_park: '#22c55e', // green
}

export const CATEGORY_ICONS: Record<PlaceCategory, string> = {
  restaurant: '🍜',
  cafe_bar: '☕',
  shopping: '🛍️',
  attraction: '🏯',
  nature_park: '🌿',
}
