import type { Database } from './database'
import type { PlaceRow } from './places'

export type ItineraryItemRow = Database['public']['Tables']['itinerary_items']['Row']
export type ItineraryItemInsert = Database['public']['Tables']['itinerary_items']['Insert']
export type ItineraryItemUpdate = Database['public']['Tables']['itinerary_items']['Update']

// Narrowed union type — DB stores as `string`
export type TimeSlot = 'morning' | 'afternoon' | 'evening'

export const TIME_SLOTS: { value: TimeSlot; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
]

export interface ItineraryItemWithPlace extends ItineraryItemRow {
  place: PlaceRow | null
}
