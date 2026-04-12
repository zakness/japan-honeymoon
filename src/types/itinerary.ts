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

export function deriveTimeSlot(reservationTime: string): TimeSlot {
  const hours = parseInt(reservationTime.split(':')[0], 10)
  if (hours < 12) return 'morning'
  if (hours < 17) return 'afternoon'
  return 'evening'
}

export function formatReservationTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`
}

/** Parse a droppable slot ID of the form `slot-{YYYY-MM-DD}-{slot}` */
export function parseSlotDropId(id: string): { dayDate: string; slot: TimeSlot } | null {
  const m = id.match(/^slot-(\d{4}-\d{2}-\d{2})-(\w+)$/)
  return m ? { dayDate: m[1], slot: m[2] as TimeSlot } : null
}
