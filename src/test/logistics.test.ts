import { describe, it, expect } from 'vitest'
import {
  buildLogisticsTimeline,
  groupEntriesByDate,
  localDateForAirport,
  localTimeHHMMForAirport,
  normalizeTimeColumn,
} from '@/lib/logistics-utils'
import type { FlightRow } from '@/types/flights'
import type { AccommodationRow } from '@/types/accommodations'
import type { TransportItemRow } from '@/types/transport'

// ---- Factory helpers ----

function makeFlight(overrides?: Partial<FlightRow>): FlightRow {
  return {
    id: 'f1',
    airline: 'Japan Airlines',
    flight_number: 'JL5',
    dep_airport: 'JFK',
    arr_airport: 'HND',
    departure_at: '2026-05-15T17:35:00Z', // 1:35 PM EDT at JFK
    arrival_at: '2026-05-16T07:40:00Z',
    confirmation: 'CGN3RT',
    notes: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

function makeAccommodation(overrides?: Partial<AccommodationRow>): AccommodationRow {
  return {
    id: 'a1',
    name: 'Hotel Tokyo',
    city: 'tokyo',
    check_in_date: '2026-05-16',
    check_out_date: '2026-05-22',
    confirmation_numbers: ['ABC123'],
    booking_url: null,
    address: null,
    lat: null,
    lng: null,
    website: null,
    booked_by: null,
    check_in_time: '15:00:00',
    check_out_time: '11:00:00',
    google_place_id: null,
    rating: null,
    photos: [],
    tags: [],
    notes: null,
    phone: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

function makeTransport(overrides?: Partial<TransportItemRow>): TransportItemRow {
  return {
    id: 't1',
    day_date: '2026-05-22',
    type: 'shinkansen',
    origin: 'Tokyo',
    destination: 'Hakone',
    departure_time: '09:00:00',
    arrival_time: '11:00:00',
    confirmation: null,
    notes: null,
    time_slot: 'morning',
    sort_order: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

// ---- normalizeTimeColumn ----

describe('normalizeTimeColumn', () => {
  it('returns null for null input', () => {
    expect(normalizeTimeColumn(null)).toBeNull()
  })

  it('trims HH:MM:SS to HH:MM', () => {
    expect(normalizeTimeColumn('15:00:00')).toBe('15:00')
    expect(normalizeTimeColumn('09:30:00')).toBe('09:30')
  })

  it('passes through HH:MM unchanged', () => {
    expect(normalizeTimeColumn('09:42')).toBe('09:42')
  })
})

// ---- localDateForAirport / localTimeHHMMForAirport ----

describe('localDateForAirport', () => {
  it('returns the local date at JFK (UTC-4 in May)', () => {
    // 2026-05-15T17:35:00Z = 1:35 PM EDT = still May 15 in New York
    expect(localDateForAirport('2026-05-15T17:35:00Z', 'JFK')).toBe('2026-05-15')
  })

  it('returns the local date at HND (UTC+9)', () => {
    // 2026-05-16T07:40:00Z = 4:40 PM JST = May 16 in Tokyo
    expect(localDateForAirport('2026-05-16T07:40:00Z', 'HND')).toBe('2026-05-16')
  })

  it('falls back to UTC for unknown airports', () => {
    expect(localDateForAirport('2026-05-15T00:00:00Z', 'XYZ')).toBe('2026-05-15')
  })
})

describe('localTimeHHMMForAirport', () => {
  it('returns local HH:MM at JFK', () => {
    // 17:35 UTC = 13:35 EDT
    expect(localTimeHHMMForAirport('2026-05-15T17:35:00Z', 'JFK')).toBe('13:35')
  })

  it('returns local HH:MM at KIX (UTC+9)', () => {
    // 05:50 UTC = 14:50 JST
    expect(localTimeHHMMForAirport('2026-05-30T05:50:00Z', 'KIX')).toBe('14:50')
  })
})

// ---- buildLogisticsTimeline ----

describe('buildLogisticsTimeline', () => {
  it('returns empty array when all sources are empty', () => {
    expect(buildLogisticsTimeline([], [], [])).toEqual([])
  })

  it('produces one flight entry with correct date and sortTime', () => {
    const result = buildLogisticsTimeline([makeFlight()], [], [])
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe('flight')
    expect(result[0].date).toBe('2026-05-15')
    expect(result[0].sortTime).toBe('13:35')
  })

  it('produces two entries per accommodation (checkin + checkout)', () => {
    const result = buildLogisticsTimeline([], [makeAccommodation()], [])
    expect(result).toHaveLength(2)
    const kinds = result.map((e) => e.kind)
    expect(kinds).toContain('hotel_checkin')
    expect(kinds).toContain('hotel_checkout')
  })

  it('checkin entry uses check_in_date and check_in_time', () => {
    const result = buildLogisticsTimeline([], [makeAccommodation()], [])
    const checkin = result.find((e) => e.kind === 'hotel_checkin')!
    expect(checkin.date).toBe('2026-05-16')
    expect(checkin.sortTime).toBe('15:00')
  })

  it('checkout entry uses check_out_date and check_out_time', () => {
    const result = buildLogisticsTimeline([], [makeAccommodation()], [])
    const checkout = result.find((e) => e.kind === 'hotel_checkout')!
    expect(checkout.date).toBe('2026-05-22')
    expect(checkout.sortTime).toBe('11:00')
  })

  it('hotel entries with null times have null sortTime', () => {
    const hotel = makeAccommodation({ check_in_time: null, check_out_time: null })
    const result = buildLogisticsTimeline([], [hotel], [])
    expect(result[0].sortTime).toBeNull()
    expect(result[1].sortTime).toBeNull()
  })

  it('produces one transport entry with correct date and sortTime', () => {
    const result = buildLogisticsTimeline([], [], [makeTransport()])
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe('transport')
    expect(result[0].date).toBe('2026-05-22')
    expect(result[0].sortTime).toBe('09:00')
  })

  it('sorts entries by date ascending', () => {
    const flight = makeFlight({ departure_at: '2026-05-15T17:35:00Z', dep_airport: 'JFK' })
    const transport = makeTransport({ day_date: '2026-05-22' })
    const result = buildLogisticsTimeline([flight], [], [transport])
    expect(result[0].date).toBe('2026-05-15')
    expect(result[1].date).toBe('2026-05-22')
  })

  it('sorts entries within a date by time, null times last', () => {
    const transport = makeTransport({ day_date: '2026-05-22', departure_time: '09:00:00' })
    const hotelNoTime = makeAccommodation({
      check_in_date: '2026-05-22',
      check_out_date: '2026-05-30',
      check_in_time: null,
    })
    const result = buildLogisticsTimeline([], [hotelNoTime], [transport])
    const may22 = result.filter((e) => e.date === '2026-05-22')
    expect(may22[0].kind).toBe('transport') // 09:00 sorts first
    expect(may22[1].kind).toBe('hotel_checkin') // null sorts last
  })

  it('multiple accommodations each produce two entries', () => {
    const hotels = [
      makeAccommodation({ id: 'a1', check_in_date: '2026-05-16', check_out_date: '2026-05-22' }),
      makeAccommodation({ id: 'a2', check_in_date: '2026-05-22', check_out_date: '2026-05-24' }),
    ]
    const result = buildLogisticsTimeline([], hotels, [])
    expect(result).toHaveLength(4)
  })
})

// ---- groupEntriesByDate ----

describe('groupEntriesByDate', () => {
  it('returns empty array for empty input', () => {
    expect(groupEntriesByDate([])).toEqual([])
  })

  it('groups a single entry into one group', () => {
    const entries = buildLogisticsTimeline([], [], [makeTransport()])
    const groups = groupEntriesByDate(entries)
    expect(groups).toHaveLength(1)
    expect(groups[0].date).toBe('2026-05-22')
    expect(groups[0].entries).toHaveLength(1)
  })

  it('produces one group per distinct date', () => {
    const t1 = makeTransport({ id: 't1', day_date: '2026-05-22' })
    const t2 = makeTransport({ id: 't2', day_date: '2026-05-24' })
    const entries = buildLogisticsTimeline([], [], [t1, t2])
    const groups = groupEntriesByDate(entries)
    expect(groups).toHaveLength(2)
    expect(groups[0].date).toBe('2026-05-22')
    expect(groups[1].date).toBe('2026-05-24')
  })

  it('entries within each group maintain sorted order', () => {
    const t1 = makeTransport({ id: 't1', day_date: '2026-05-22', departure_time: '14:00:00' })
    const t2 = makeTransport({ id: 't2', day_date: '2026-05-22', departure_time: '09:00:00' })
    const entries = buildLogisticsTimeline([], [], [t1, t2])
    const groups = groupEntriesByDate(entries)
    expect(groups[0].entries[0].data.id).toBe('t2') // 09:00 first
    expect(groups[0].entries[1].data.id).toBe('t1') // 14:00 second
  })
})
