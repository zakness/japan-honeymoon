import type { Database } from './database'
import type { PlaceRow } from './places'

export type ItineraryItemRow = Database['public']['Tables']['itinerary_items']['Row']
export type ItineraryItemInsert = Database['public']['Tables']['itinerary_items']['Insert']
export type ItineraryItemUpdate = Database['public']['Tables']['itinerary_items']['Update']

// Narrowed union type — DB stores as `string`. The 7-slot taxonomy alternates
// meal anchors (`breakfast`/`lunch`/`dinner`) with the gaps between them.
export type TimeSlot =
  | 'wake-up'
  | 'breakfast'
  | 'morning'
  | 'lunch'
  | 'afternoon'
  | 'dinner'
  | 'evening'

export type TimeSlotKind = 'meal' | 'gap'

// Order in this array IS chronological order — used for rendering days
// top-to-bottom and for grouping flight events by slot.
export const TIME_SLOTS: {
  value: TimeSlot
  label: string
  shortLabel: string
  kind: TimeSlotKind
}[] = [
  { value: 'wake-up', label: 'Wake up', shortLabel: 'Wake up', kind: 'gap' },
  { value: 'breakfast', label: 'Breakfast', shortLabel: 'Breakfast', kind: 'meal' },
  { value: 'morning', label: 'Morning', shortLabel: 'Morning', kind: 'gap' },
  { value: 'lunch', label: 'Lunch', shortLabel: 'Lunch', kind: 'meal' },
  { value: 'afternoon', label: 'Afternoon', shortLabel: 'Afternoon', kind: 'gap' },
  { value: 'dinner', label: 'Dinner', shortLabel: 'Dinner', kind: 'meal' },
  { value: 'evening', label: 'Evening', shortLabel: 'Evening', kind: 'gap' },
]

export interface ItineraryItemWithPlace extends ItineraryItemRow {
  place: PlaceRow | null
}

export function deriveTimeSlot(reservationTime: string): TimeSlot {
  const [h, m] = reservationTime.split(':').map(Number)
  const minutes = (h ?? 0) * 60 + (m ?? 0)
  if (minutes < 8 * 60) return 'wake-up'
  if (minutes < 10 * 60) return 'breakfast'
  if (minutes < 11 * 60 + 30) return 'morning'
  if (minutes < 14 * 60) return 'lunch'
  if (minutes < 17 * 60) return 'afternoon'
  if (minutes < 20 * 60 + 30) return 'dinner'
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
  const m = id.match(/^slot-(\d{4}-\d{2}-\d{2})-(.+)$/)
  if (!m) return null
  return { dayDate: m[1], slot: m[2] as TimeSlot }
}

/** Parse a reorder gap drop ID of the form `reorder-{YYYY-MM-DD}-{slot}-{index}` */
export function parseReorderDropId(
  id: string
): { dayDate: string; slot: TimeSlot; index: number } | null {
  const m = id.match(/^reorder-(\d{4}-\d{2}-\d{2})-(.+)-(\d+)$/)
  if (!m) return null
  return { dayDate: m[1], slot: m[2] as TimeSlot, index: parseInt(m[3], 10) }
}

/**
 * Invariant: a reservation implies the item is decided. These helpers apply
 * that rule to insert/update payloads before they hit Supabase. Clearing a
 * reservation does NOT flip `is_decided` back — a user may still consider the
 * plan locked in without a specific time.
 */
export function applyDecidedInvariantToInsert(item: ItineraryItemInsert): ItineraryItemInsert {
  return item.reservation_time ? { ...item, is_decided: true } : item
}

export function applyDecidedInvariantToUpdate(update: ItineraryItemUpdate): ItineraryItemUpdate {
  return update.reservation_time != null ? { ...update, is_decided: true } : update
}
