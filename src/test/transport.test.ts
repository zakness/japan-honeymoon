import { describe, it, expect } from 'vitest'
import { TRANSPORT_TYPES } from '@/types/transport'
import { mergeSlotItems } from '@/lib/transport-utils'
import type { ItineraryItemWithPlace } from '@/types/itinerary'
import type { TransportItemRow } from '@/types/transport'

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
    place: null,
    ...overrides,
  }
}

function makeTransportItem(
  overrides: Partial<TransportItemRow> & { id: string; sort_order: number; time_slot: string }
): TransportItemRow {
  return {
    created_at: '',
    updated_at: '',
    day_date: '2026-05-20',
    type: 'shinkansen',
    origin: 'Tokyo',
    destination: 'Kyoto',
    departure_time: '09:00',
    arrival_time: null,
    confirmation: null,
    notes: null,
    ...overrides,
  }
}

// ---- TRANSPORT_TYPES ----

describe('TRANSPORT_TYPES', () => {
  it('has exactly 6 entries', () => {
    expect(TRANSPORT_TYPES).toHaveLength(6)
  })

  it('each entry has value, label, and icon', () => {
    for (const t of TRANSPORT_TYPES) {
      expect(t.value).toBeTruthy()
      expect(t.label).toBeTruthy()
      expect(t.icon).toBeTruthy()
    }
  })

  it('all values are unique', () => {
    const values = TRANSPORT_TYPES.map((t) => t.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('includes expected transport modes', () => {
    const values = TRANSPORT_TYPES.map((t) => t.value)
    expect(values).toContain('shinkansen')
    expect(values).toContain('ferry')
    expect(values).toContain('subway')
  })
})

// ---- mergeSlotItems ----

describe('mergeSlotItems', () => {
  it('places items into the correct time slot', () => {
    const itinerary = [makeItineraryItem({ id: 'i1', sort_order: 0, time_slot: 'morning' })]
    const transport = [makeTransportItem({ id: 't1', sort_order: 1, time_slot: 'evening' })]
    const result = mergeSlotItems(itinerary, transport)
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
    const transport = [makeTransportItem({ id: 't1', sort_order: 1, time_slot: 'morning' })]
    const result = mergeSlotItems(itinerary, transport)
    expect(result.morning.map((i) => i.data.id)).toEqual(['i2', 't1', 'i1'])
  })

  it('returns empty slots when no items provided', () => {
    const result = mergeSlotItems([], [])
    expect(result.morning).toHaveLength(0)
    expect(result.afternoon).toHaveLength(0)
    expect(result.evening).toHaveLength(0)
  })

  it('handles transport-only and itinerary-only days', () => {
    const transport = [
      makeTransportItem({ id: 't1', sort_order: 0, time_slot: 'morning' }),
      makeTransportItem({ id: 't2', sort_order: 1, time_slot: 'morning' }),
    ]
    const result = mergeSlotItems([], transport)
    expect(result.morning).toHaveLength(2)
    expect(result.morning.every((i) => i.kind === 'transport')).toBe(true)
  })

  it('preserves kind discriminant for each item', () => {
    const itinerary = [makeItineraryItem({ id: 'i1', sort_order: 0, time_slot: 'afternoon' })]
    const transport = [makeTransportItem({ id: 't1', sort_order: 1, time_slot: 'afternoon' })]
    const result = mergeSlotItems(itinerary, transport)
    const kinds = result.afternoon.map((i) => i.kind)
    expect(kinds).toContain('itinerary')
    expect(kinds).toContain('transport')
  })
})
