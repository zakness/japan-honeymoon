import { describe, it, expect } from 'vitest'
import { TRANSPORT_MODES, TRANSPORT_TYPES } from '@/types/transport'
import { deriveJourneyDisplay, mergeSlotItems, slotItemId } from '@/lib/transport-utils'
import type { ItineraryItemWithPlace } from '@/types/itinerary'
import type { Journey, TransportLegRow } from '@/types/transport'

// ---- Minimal factory helpers ----

function makeItineraryItem(
  overrides: Partial<ItineraryItemWithPlace> & { id: string; sort_order: number; time_slot: string }
): ItineraryItemWithPlace {
  return {
    created_at: '',
    updated_at: '',
    day_date: '2026-05-20',
    place_id: null,
    text_note: 'note',
    reservation_time: null,
    reservation_notes: null,
    is_decided: false,
    images: null,
    place: null,
    ...overrides,
  }
}

function makeLeg(overrides: Partial<TransportLegRow> & { id: string }): TransportLegRow {
  return {
    created_at: '',
    updated_at: '',
    transport_id: 't1',
    leg_index: 0,
    mode: 'shinkansen',
    origin_name: 'Tokyo',
    origin_place_id: null,
    origin_lat: null,
    origin_lng: null,
    destination_name: 'Kyoto',
    destination_place_id: null,
    destination_lat: null,
    destination_lng: null,
    departure_time: '09:00:00',
    arrival_time: null,
    is_booked: false,
    confirmation: null,
    notes: null,
    ...overrides,
  }
}

function makeJourney(overrides: {
  id: string
  sort_order: number
  time_slot: string
  legs?: TransportLegRow[]
}): Journey {
  return {
    parent: {
      id: overrides.id,
      created_at: '',
      updated_at: '',
      day_date: '2026-05-20',
      time_slot: overrides.time_slot,
      sort_order: overrides.sort_order,
      title: null,
      notes: null,
    },
    legs: overrides.legs ?? [makeLeg({ id: `${overrides.id}-l0`, transport_id: overrides.id })],
  }
}

// ---- TRANSPORT_MODES / TRANSPORT_TYPES ----

describe('TRANSPORT_MODES', () => {
  it('has exactly 6 entries', () => {
    expect(TRANSPORT_MODES).toHaveLength(6)
  })

  it('each entry has value, label, and icon', () => {
    for (const t of TRANSPORT_MODES) {
      expect(t.value).toBeTruthy()
      expect(t.label).toBeTruthy()
      expect(t.icon).toBeTruthy()
    }
  })

  it('all values are unique', () => {
    const values = TRANSPORT_MODES.map((t) => t.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('includes expected transport modes', () => {
    const values = TRANSPORT_MODES.map((t) => t.value)
    expect(values).toContain('shinkansen')
    expect(values).toContain('ferry')
    expect(values).toContain('subway')
  })

  it('TRANSPORT_TYPES alias matches TRANSPORT_MODES', () => {
    expect(TRANSPORT_TYPES).toBe(TRANSPORT_MODES)
  })
})

// ---- mergeSlotItems ----

describe('mergeSlotItems', () => {
  it('places items into the correct time slot', () => {
    const itinerary = [makeItineraryItem({ id: 'i1', sort_order: 0, time_slot: 'morning' })]
    const journeys = [makeJourney({ id: 't1', sort_order: 1, time_slot: 'evening' })]
    const result = mergeSlotItems(itinerary, journeys)
    expect(result.morning).toHaveLength(1)
    expect(result.morning[0].kind).toBe('itinerary')
    expect(result.evening).toHaveLength(1)
    expect(result.evening[0].kind).toBe('transport')
    expect(result.afternoon).toHaveLength(0)
  })

  it('interleaves items within a slot sorted by sort_order', () => {
    const itinerary = [
      makeItineraryItem({ id: 'i1', sort_order: 2, time_slot: 'morning' }),
      makeItineraryItem({ id: 'i2', sort_order: 0, time_slot: 'morning' }),
    ]
    const journeys = [makeJourney({ id: 't1', sort_order: 1, time_slot: 'morning' })]
    const result = mergeSlotItems(itinerary, journeys)
    expect(result.morning.map(slotItemId)).toEqual(['i2', 't1', 'i1'])
  })

  it('returns empty slots when no items provided', () => {
    const result = mergeSlotItems([], [])
    expect(result.morning).toHaveLength(0)
    expect(result.afternoon).toHaveLength(0)
    expect(result.evening).toHaveLength(0)
  })

  it('handles transport-only and itinerary-only days', () => {
    const journeys = [
      makeJourney({ id: 't1', sort_order: 0, time_slot: 'morning' }),
      makeJourney({ id: 't2', sort_order: 1, time_slot: 'morning' }),
    ]
    const result = mergeSlotItems([], journeys)
    expect(result.morning).toHaveLength(2)
    expect(result.morning.every((i) => i.kind === 'transport')).toBe(true)
  })

  it('preserves kind discriminant for each item', () => {
    const itinerary = [makeItineraryItem({ id: 'i1', sort_order: 0, time_slot: 'afternoon' })]
    const journeys = [makeJourney({ id: 't1', sort_order: 1, time_slot: 'afternoon' })]
    const result = mergeSlotItems(itinerary, journeys)
    const kinds = result.afternoon.map((i) => i.kind)
    expect(kinds).toContain('itinerary')
    expect(kinds).toContain('transport')
  })
})

// ---- deriveJourneyDisplay ----

describe('deriveJourneyDisplay', () => {
  it('uses first leg origin and last leg destination', () => {
    const journey = makeJourney({
      id: 't1',
      sort_order: 0,
      time_slot: 'morning',
      legs: [
        makeLeg({ id: 'l0', leg_index: 0, origin_name: 'Kyoto', destination_name: 'Okayama' }),
        makeLeg({ id: 'l1', leg_index: 1, origin_name: 'Okayama', destination_name: 'Uno' }),
        makeLeg({ id: 'l2', leg_index: 2, origin_name: 'Uno', destination_name: 'Naoshima' }),
      ],
    })
    const d = deriveJourneyDisplay(journey)
    expect(d.originName).toBe('Kyoto')
    expect(d.destinationName).toBe('Naoshima')
    expect(d.totalCount).toBe(3)
  })

  it('computes earliest departure and latest arrival across legs', () => {
    const journey = makeJourney({
      id: 't1',
      sort_order: 0,
      time_slot: 'morning',
      legs: [
        makeLeg({ id: 'l0', leg_index: 0, departure_time: '09:12:00', arrival_time: '10:19:00' }),
        makeLeg({ id: 'l1', leg_index: 1, departure_time: '10:45:00', arrival_time: '11:30:00' }),
        makeLeg({ id: 'l2', leg_index: 2, departure_time: '12:20:00', arrival_time: '12:35:00' }),
      ],
    })
    const d = deriveJourneyDisplay(journey)
    expect(d.earliestDeparture).toBe('09:12:00')
    expect(d.latestArrival).toBe('12:35:00')
  })

  it('reports booked count across mixed-status legs', () => {
    const journey = makeJourney({
      id: 't1',
      sort_order: 0,
      time_slot: 'morning',
      legs: [
        makeLeg({ id: 'l0', is_booked: true }),
        makeLeg({ id: 'l1', is_booked: false }),
        makeLeg({ id: 'l2', is_booked: false }),
        makeLeg({ id: 'l3', is_booked: false }),
      ],
    })
    const d = deriveJourneyDisplay(journey)
    expect(d.bookedCount).toBe(1)
    expect(d.totalCount).toBe(4)
  })

  it('prefers parent title over derived title when set', () => {
    const journey = makeJourney({ id: 't1', sort_order: 0, time_slot: 'morning' })
    journey.parent.title = 'Custom title'
    expect(deriveJourneyDisplay(journey).title).toBe('Custom title')
  })

  it('falls back to "Transport" when legs lack endpoints and no title', () => {
    const journey = makeJourney({
      id: 't1',
      sort_order: 0,
      time_slot: 'morning',
      legs: [makeLeg({ id: 'l0', origin_name: '', destination_name: '' })],
    })
    expect(deriveJourneyDisplay(journey).title).toBe('Transport')
  })

  it('returns null latestArrival when no legs have arrival_time', () => {
    const journey = makeJourney({
      id: 't1',
      sort_order: 0,
      time_slot: 'morning',
      legs: [makeLeg({ id: 'l0', arrival_time: null })],
    })
    expect(deriveJourneyDisplay(journey).latestArrival).toBeNull()
  })
})
