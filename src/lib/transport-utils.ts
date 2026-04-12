import type { ItineraryItemWithPlace, TimeSlot } from '@/types/itinerary'
import type { SlotItem, TransportItemRow } from '@/types/transport'

export function mergeSlotItems(
  itineraryItems: ItineraryItemWithPlace[],
  transportItems: TransportItemRow[]
): Record<TimeSlot, SlotItem[]> {
  const grouped: Record<TimeSlot, SlotItem[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  }
  for (const item of itineraryItems) {
    const slot = (item.time_slot as TimeSlot) || 'morning'
    grouped[slot].push({ kind: 'itinerary', data: item })
  }
  for (const item of transportItems) {
    const slot = (item.time_slot as TimeSlot) || 'morning'
    grouped[slot].push({ kind: 'transport', data: item })
  }
  for (const slot of Object.keys(grouped) as TimeSlot[]) {
    grouped[slot].sort((a, b) => a.data.sort_order - b.data.sort_order)
  }
  return grouped
}
