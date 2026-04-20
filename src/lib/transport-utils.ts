import type { ItineraryItemWithPlace, TimeSlot } from '@/types/itinerary'
import type { Journey, SlotItem, TransportMode } from '@/types/transport'

// ---- SlotItem accessors ----
// The `data` field on a SlotItem is heterogeneous — for itinerary items it's a
// flat row, for transport it's a { parent, legs } journey. These helpers
// normalize access to the common anchor fields (id/sort_order/time_slot) so
// callers don't have to dispatch on kind every time.

export function slotItemId(item: SlotItem): string {
  return item.kind === 'itinerary' ? item.data.id : item.data.parent.id
}

export function slotItemSortOrder(item: SlotItem): number {
  return item.kind === 'itinerary' ? item.data.sort_order : item.data.parent.sort_order
}

export function slotItemTimeSlot(item: SlotItem): string {
  return item.kind === 'itinerary' ? item.data.time_slot : item.data.parent.time_slot
}

export function mergeSlotItems(
  itineraryItems: ItineraryItemWithPlace[],
  journeys: Journey[]
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
  for (const journey of journeys) {
    const slot = (journey.parent.time_slot as TimeSlot) || 'morning'
    grouped[slot].push({ kind: 'transport', data: journey })
  }
  for (const slot of Object.keys(grouped) as TimeSlot[]) {
    grouped[slot].sort((a, b) => slotItemSortOrder(a) - slotItemSortOrder(b))
  }
  return grouped
}

export type JourneyDisplay = {
  title: string
  originName: string
  destinationName: string
  earliestDeparture: string | null
  latestArrival: string | null
  bookedCount: number
  totalCount: number
  modes: TransportMode[]
}

export function deriveJourneyDisplay(journey: Journey): JourneyDisplay {
  const { parent, legs } = journey
  const first = legs[0]
  const last = legs[legs.length - 1]

  const originName = first?.origin_name ?? ''
  const destinationName = last?.destination_name ?? ''

  // Times are stored as HH:MM:SS strings; lexical sort matches chronological for same-day legs.
  const departures = legs.map((l) => l.departure_time).filter(Boolean) as string[]
  const arrivals = legs.map((l) => l.arrival_time).filter(Boolean) as string[]

  const earliestDeparture =
    departures.length > 0 ? departures.reduce((a, b) => (a < b ? a : b)) : null
  const latestArrival = arrivals.length > 0 ? arrivals.reduce((a, b) => (a > b ? a : b)) : null

  const bookedCount = legs.filter((l) => l.is_booked).length
  const modes = legs.map((l) => l.mode as TransportMode)

  const derivedTitle =
    originName && destinationName ? `${originName} → ${destinationName}` : 'Transport'

  return {
    title: parent.title ?? derivedTitle,
    originName,
    destinationName,
    earliestDeparture,
    latestArrival,
    bookedCount,
    totalCount: legs.length,
    modes,
  }
}
